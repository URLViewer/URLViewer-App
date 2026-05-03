import { app } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, cp, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as fs from "node:fs";
import os from "node:os";
import { pluginManifestSchema } from "@shared/schemas";
import { BUILTIN_PLUGIN_SEEDS } from "@shared/pluginCatalog";
import type {
  GitInstallPayload,
  InstallPluginResult,
  PluginListItem,
  PluginManifestV1,
  PluginPanelSpec,
  PluginState,
} from "@shared/types";
import { AppStoreService } from "@electron/store/appStore";
import { deletePluginToken, getPluginToken, savePluginToken } from "@electron/services/keychain";
import type { RendererPluginContext } from "@m3u8viewer/plugin-sdk";

const BUILTIN_PLUGIN_IDS = new Set(BUILTIN_PLUGIN_SEEDS.map((item) => item.id));
const require = createRequire(__filename);

type AdmZipEntryLike = { entryName: string };
type AdmZipLike = {
  extractAllTo: (targetPath: string, overwrite?: boolean) => void;
  getEntries: () => AdmZipEntryLike[];
};
type AdmZipConstructor = new (zipPath: string) => AdmZipLike;

type GitLike = {
  clone: (options: {
    fs: typeof fs;
    http: unknown;
    dir: string;
    url: string;
    singleBranch: boolean;
    depth: number;
    ref?: string;
    onAuth: () => { username?: string; password?: string };
  }) => Promise<unknown>;
  pull: (options: {
    fs: typeof fs;
    http: unknown;
    dir: string;
    singleBranch: boolean;
    fastForwardOnly: boolean;
    author: { name: string; email: string };
    onAuth: () => { username?: string; password?: string };
  }) => Promise<unknown>;
};

let admZipCtorCache: AdmZipConstructor | null | undefined;
let gitRuntimeCache:
  | {
      git: GitLike;
      http: unknown;
    }
  | null
  | undefined;

function getAdmZipCtor(): AdmZipConstructor {
  if (admZipCtorCache) {
    return admZipCtorCache;
  }
  const loaded = require("adm-zip") as AdmZipConstructor;
  admZipCtorCache = loaded;
  return loaded;
}

function getGitRuntime(): { git: GitLike; http: unknown } {
  if (gitRuntimeCache) {
    return gitRuntimeCache;
  }
  const gitModule = require("isomorphic-git") as GitLike;
  const httpModule = require("isomorphic-git/http/node") as { default?: unknown };
  gitRuntimeCache = {
    git: gitModule,
    http: httpModule.default ?? httpModule,
  };
  return gitRuntimeCache;
}

type InstallSource = {
  sourceType: PluginListItem["sourceType"];
  sourceRef: string;
};

type GitInstallTarget = {
  cloneUrl: string;
  branch?: string;
  pluginSubPath?: string;
  sourceRef: string;
};

type ExternalPluginLike = {
  runtime?: {
    input?: {
      panel?: PluginPanelSpec;
      resolveToVideoSources?: (
        input: string,
        context: RendererPluginContext,
      ) => Promise<string[]> | string[];
    };
  };
};

export class PluginManager {
  private pluginsDir: string;

  constructor(private store: AppStoreService) {
    this.pluginsDir = path.join(app.getPath("userData"), "plugins");
  }

  private getState(): PluginState {
    return this.ensureBuiltins(this.store.getPlugins());
  }

  private saveState(next: PluginState): PluginState {
    return this.store.savePlugins(this.ensureBuiltins(next));
  }

  private ensureBuiltins(state: PluginState): PluginState {
    const byId = new Map(
      state.items.map((item) => [item.id, item]),
    );
    for (const seed of BUILTIN_PLUGIN_SEEDS) {
      if (!byId.has(seed.id)) {
        byId.set(seed.id, seed);
      }
    }

    const items = [...byId.values()]
      .sort((a, b) => a.order - b.order || a.manifest.name.localeCompare(b.manifest.name))
      .map((item, index) => ({ ...item, order: index }));

    return { schemaVersion: 1, items };
  }

  async list(): Promise<PluginListItem[]> {
    return this.getState().items;
  }

  async getInputPanels(): Promise<PluginListItem[]> {
    const state = this.getState();
    const candidates = state.items
      .filter((item) => item.enabled && item.manifest.capabilities.includes("input-panel"))
      .sort((a, b) => a.order - b.order);

    const resolved = await Promise.all(
      candidates.map(async (item) => {
        try {
          const runtime = await this.loadExternalInputRuntime(item);
          const panel =
            runtime.panel ?? {
              title: item.manifest.name,
              inputLabel: "入力",
              submitLabel: "実行",
            };
          return { ...item, panel };
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown";
          console.warn(`[plugin] panel-load-failed pluginId=${item.id} reason=${message}`);
          return null;
        }
      }),
    );

    return resolved.filter(
      (item): item is NonNullable<(typeof resolved)[number]> => item !== null,
    );
  }

  async resolveInput(pluginId: string, input: string, timeoutMs: number): Promise<string[]> {
    const state = this.getState();
    const plugin = state.items.find((item) => item.id === pluginId);
    if (!plugin || !plugin.enabled || !plugin.manifest.capabilities.includes("input-panel")) {
      throw new Error("plugin-entry-load-failed");
    }

    const runtime = await this.loadExternalInputRuntime(plugin);
    const boundedTimeoutMs = Math.max(1000, timeoutMs);
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("plugin-timeout")), boundedTimeoutMs);
    });

    try {
      const resolved = Promise.resolve(
        runtime.resolveToVideoSources(input, this.createRuntimeContext()),
      );
      const urls = await Promise.race([resolved, timeoutPromise]);
      return [...new Set((Array.isArray(urls) ? urls : []).filter((entry) => typeof entry === "string"))];
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "plugin-timeout" || error.message === "plugin-entry-load-failed")
      ) {
        throw error;
      }
      throw new Error("plugin-runtime-error", {
        cause: error,
      });
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  async enable(pluginId: string, enabled: boolean): Promise<PluginListItem[]> {
    const state = this.getState();
    const next = state.items.map((item) =>
      item.id === pluginId ? { ...item, enabled } : item,
    );

    this.saveState({ ...state, items: next });
    return this.list();
  }

  async reorder(orderedIds: string[]): Promise<PluginListItem[]> {
    const state = this.getState();
    const currentIds = state.items.map((item) => item.id);
    const hasSameSet =
      orderedIds.length === currentIds.length &&
      orderedIds.every((id) => currentIds.includes(id));
    if (!hasSameSet) {
      throw new Error("invalid-order");
    }

    const byId = new Map(state.items.map((item) => [item.id, item]));
    const next = orderedIds.map((id, index) => ({ ...(byId.get(id) as PluginListItem), order: index }));

    this.saveState({ ...state, items: next });
    return this.list();
  }

  async remove(pluginId: string): Promise<PluginListItem[]> {
    const state = this.getState();
    const target = state.items.find((item) => item.id === pluginId);
    if (!target) {
      return state.items;
    }
    if (BUILTIN_PLUGIN_IDS.has(target.id)) {
      throw new Error("cannot-remove-builtin");
    }

    if (target.localPath && existsSync(target.localPath)) {
      await rm(target.localPath, { recursive: true, force: true });
    }
    await deletePluginToken(pluginId);

    const next = state.items
      .filter((item) => item.id !== pluginId)
      .map((item, index) => ({ ...item, order: index }));
    this.saveState({ ...state, items: next });
    return this.list();
  }

  async installFromFolder(folderPath: string): Promise<InstallPluginResult> {
    return this.installFromFolderInternal(folderPath, {
      sourceType: "folder",
      sourceRef: folderPath,
    });
  }

  async installFromZip(zipPath: string): Promise<InstallPluginResult> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "m3u8-plugin-zip-"));
    try {
      const AdmZipCtor = getAdmZipCtor();
      const zip = new AdmZipCtor(zipPath);
      zip.extractAllTo(tempDir, true);

      let targetDir = tempDir;
      const rootManifestPath = path.join(tempDir, "plugin.json");
      if (!existsSync(rootManifestPath)) {
        const [firstEntry] = zip.getEntries();
        if (firstEntry?.entryName) {
          const rootName = firstEntry.entryName.split("/")[0];
          const candidate = path.join(tempDir, rootName);
          if (existsSync(path.join(candidate, "plugin.json"))) {
            targetDir = candidate;
          }
        }
      }

      return await this.installFromFolderInternal(targetDir, {
        sourceType: "zip",
        sourceRef: zipPath,
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  async installFromGit(payload: GitInstallPayload): Promise<InstallPluginResult> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "m3u8-plugin-git-"));
    try {
      const target = this.resolveGitInstallTarget(payload);
      const { git, http } = getGitRuntime();
      await git.clone({
        fs,
        http,
        dir: tempDir,
        url: target.cloneUrl,
        singleBranch: true,
        depth: 1,
        ref: target.branch,
        onAuth: () =>
          payload.token
            ? { username: "token", password: payload.token }
            : {},
      });

      const pluginRoot = this.resolvePluginRootFromGitClone(tempDir, target.pluginSubPath);
      const sourceType: PluginListItem["sourceType"] = target.pluginSubPath ? "folder" : "git";

      const result = await this.installFromFolderInternal(pluginRoot, {
        sourceType,
        sourceRef: target.sourceRef,
      });
      if (result.status === "installed" && sourceType === "git" && payload.token) {
        await savePluginToken(result.plugin.id, payload.token);
      }

      return result;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  async update(pluginId: string): Promise<PluginListItem[]> {
    const state = this.getState();
    const target = state.items.find((item) => item.id === pluginId);
    if (!target || target.sourceType !== "git" || !target.localPath || !target.sourceRef) {
      throw new Error("plugin-not-updatable");
    }

    const token = await getPluginToken(pluginId);
    const { git, http } = getGitRuntime();
    await git.pull({
      fs,
      http,
      dir: target.localPath,
      singleBranch: true,
      fastForwardOnly: false,
      author: { name: "m3u8-viewer", email: "local@localhost" },
      onAuth: () =>
        token
          ? { username: "token", password: token }
          : {},
    });

    const manifest = await this.readManifest(target.localPath);
    const next = state.items.map((item) =>
      item.id === pluginId
        ? {
            ...item,
            manifest,
            lastUpdatedAt: new Date().toISOString(),
          }
        : item,
    );
    this.saveState({ ...state, items: next });
    return this.list();
  }

  private async installFromFolderInternal(folderPath: string, source: InstallSource): Promise<InstallPluginResult> {
    const manifest = await this.readManifest(folderPath);
    const state = this.getState();
    const existing = state.items.find((item) => item.id === manifest.id);
    if (existing) {
      return { status: "rejected", reason: "duplicate-plugin-id" };
    }

    const targetPath = path.join(this.pluginsDir, manifest.id);
    await mkdir(this.pluginsDir, { recursive: true });
    await rm(targetPath, { recursive: true, force: true });
    await cp(folderPath, targetPath, { recursive: true });

    const plugin: PluginListItem = {
      id: manifest.id,
      enabled: true,
      order: state.items.length,
      sourceType: source.sourceType,
      sourceRef: source.sourceRef,
      localPath: targetPath,
      lastUpdatedAt: new Date().toISOString(),
      manifest,
    };

    this.saveState({ ...state, items: [...state.items, plugin] });
    return { status: "installed", plugin };
  }

  private async readManifest(pluginRoot: string): Promise<PluginManifestV1> {
    const manifestPath = path.join(pluginRoot, "plugin.json");
    let raw: string;
    try {
      raw = await readFile(manifestPath, "utf-8");
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        throw new Error(`plugin-manifest-not-found: ${manifestPath}`);
      }
      throw error;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new Error(`plugin-manifest-invalid-json: ${manifestPath}`);
    }

    try {
      return pluginManifestSchema.parse(parsedJson);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      throw new Error(`plugin-manifest-invalid-schema: ${reason}`);
    }
  }

  private createRuntimeContext(): RendererPluginContext {
    return {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      nowIso: new Date().toISOString(),
      appVersion: app.getVersion(),
    };
  }

  private resolvePluginEntryPath(plugin: PluginListItem): string {
    if (!plugin.localPath) {
      throw new Error("plugin-entry-load-failed");
    }

    const pluginRoot = path.resolve(plugin.localPath);
    const entryPath = path.resolve(pluginRoot, plugin.manifest.entry);
    const relative = path.relative(pluginRoot, entryPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("plugin-entry-load-failed");
    }
    if (!existsSync(entryPath)) {
      throw new Error("plugin-entry-load-failed");
    }

    return entryPath;
  }

  private async importPluginModule(entryPath: string): Promise<ExternalPluginLike> {
    const entryStat = await stat(entryPath);
    const entryUrl = pathToFileURL(entryPath);
    entryUrl.searchParams.set("mtime", String(entryStat.mtimeMs));
    const loaded: unknown = await import(entryUrl.href);
    const resolved =
      loaded && typeof loaded === "object" && "default" in loaded
        ? (loaded as { default: unknown }).default
        : loaded;

    if (!resolved || typeof resolved !== "object") {
      throw new Error("plugin-entry-load-failed");
    }

    return resolved as ExternalPluginLike;
  }

  private async loadExternalInputRuntime(plugin: PluginListItem): Promise<{
    panel?: PluginPanelSpec;
    resolveToVideoSources: (
      input: string,
      context: RendererPluginContext,
    ) => Promise<string[]> | string[];
  }> {
    if (plugin.sourceType === "builtin") {
      throw new Error("plugin-entry-load-failed");
    }

    const entryPath = this.resolvePluginEntryPath(plugin);
    const loaded = await this.importPluginModule(entryPath);
    const runtime = loaded.runtime?.input;
    if (!runtime || typeof runtime.resolveToVideoSources !== "function") {
      throw new Error("plugin-entry-load-failed");
    }

    return {
      panel: runtime.panel,
      resolveToVideoSources: runtime.resolveToVideoSources,
    };
  }

  private resolveGitInstallTarget(payload: GitInstallPayload): GitInstallTarget {
    const rawUrl = payload.url.trim();
    const explicitBranch = payload.branch?.trim() || undefined;

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return {
        cloneUrl: rawUrl,
        branch: explicitBranch,
        sourceRef: rawUrl,
      };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isGitHub = hostname === "github.com" || hostname === "www.github.com";
    if (!isGitHub) {
      return {
        cloneUrl: rawUrl,
        branch: explicitBranch,
        sourceRef: rawUrl,
      };
    }

    const parts = parsed.pathname
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length < 2) {
      return {
        cloneUrl: rawUrl,
        branch: explicitBranch,
        sourceRef: rawUrl,
      };
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    const cloneUrl = `https://github.com/${owner}/${repo}.git`;

    if (parts[2] === "tree" && parts.length >= 5) {
      const branchFromUrl = decodeURIComponent(parts[3]);
      const subPath = parts
        .slice(4)
        .map((part) => decodeURIComponent(part))
        .join("/");
      return {
        cloneUrl,
        branch: explicitBranch ?? branchFromUrl,
        pluginSubPath: subPath,
        sourceRef: rawUrl,
      };
    }

    return {
      cloneUrl,
      branch: explicitBranch,
      sourceRef: rawUrl,
    };
  }

  private resolvePluginRootFromGitClone(clonedRepoRoot: string, pluginSubPath?: string): string {
    if (!pluginSubPath) {
      return clonedRepoRoot;
    }

    const root = path.resolve(clonedRepoRoot);
    const resolved = path.resolve(clonedRepoRoot, pluginSubPath);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("plugin-entry-load-failed");
    }

    return resolved;
  }
}
