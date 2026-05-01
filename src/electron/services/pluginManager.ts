import electron from "electron";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, cp, mkdir } from "node:fs/promises";
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
  PluginState,
} from "@shared/types";
import { AppStoreService } from "@electron/store/appStore";
import { deletePluginToken, getPluginToken, savePluginToken } from "@electron/services/keychain";

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

export class PluginManager {
  private pluginsDir: string;

  constructor(private store: AppStoreService) {
    this.pluginsDir = path.join(electron.app.getPath("userData"), "plugins");
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
    return state.items
      .filter((item) => item.enabled && item.manifest.capabilities.includes("input-panel"))
      .sort((a, b) => a.order - b.order);
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
      const { git, http } = getGitRuntime();
      await git.clone({
        fs,
        http,
        dir: tempDir,
        url: payload.url,
        singleBranch: true,
        depth: 1,
        ref: payload.branch,
        onAuth: () =>
          payload.token
            ? { username: "token", password: payload.token }
            : {},
      });

      const result = await this.installFromFolderInternal(tempDir, {
        sourceType: "git",
        sourceRef: payload.url,
      });
      if (result.status === "installed" && payload.token) {
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
    const raw = await readFile(manifestPath, "utf-8");
    const parsed = pluginManifestSchema.parse(JSON.parse(raw));
    return parsed;
  }
}
