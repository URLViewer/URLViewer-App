import type { OpenDialogOptions, SaveDialogOptions } from "electron";
import { BrowserWindow, dialog, ipcMain, app } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  appSettingsSchema,
  gitInstallPayloadSchema,
  libraryStateSchema,
  pluginEnableSchema,
  pluginRemoveSchema,
  pluginResolveInputSchema,
  pluginReorderSchema,
  registerVideoSourceSchema,
  validateVideoSourceSchema,
} from "@shared/schemas";
import type { RegisterVideoSourceResult, VideoItem } from "@shared/types";
import {
  validateVideoSourceUrl,
} from "@electron/services/videoSourceResolver";
import { AppStoreService } from "@electron/store/appStore";
import { PluginManager } from "@electron/services/pluginManager";

const resumeGetSchema = z.object({ videoId: z.string().min(1) });
const resumeSaveSchema = z.object({ videoId: z.string().min(1), seconds: z.number().min(0) });
const pathPayloadSchema = z.object({ path: z.string().min(1) });
const readTextFileSchema = z.object({ path: z.string().min(1) });
const writeTextFileSchema = z.object({ path: z.string().min(1), content: z.string() });
const pickPathSchema = z.object({ title: z.string().optional() });

function createVideoId(): string {
  return crypto.randomUUID();
}

export function registerIpcHandlers(store: AppStoreService, pluginManager: PluginManager): void {
  ipcMain.handle("settings:get", () => store.getSettings());

  ipcMain.handle("settings:save", (_event, payload) => {
    const parsed = appSettingsSchema.parse(payload);
    return store.saveSettings(parsed);
  });

  ipcMain.handle("library:get", () => store.getLibrary());

  ipcMain.handle("library:save", (_event, payload) => {
    const parsed = libraryStateSchema.parse(payload);
    return store.saveLibrary(parsed);
  });

  ipcMain.handle("videoSource:validate", async (_event, payload) => {
    const parsed = validateVideoSourceSchema.parse(payload);
    return validateVideoSourceUrl(parsed.url, parsed.timeoutMs);
  });

  ipcMain.handle("videoSource:register", async (_event, payload): Promise<RegisterVideoSourceResult> => {
    const parsed = registerVideoSourceSchema.parse(payload);
    const validated = await validateVideoSourceUrl(parsed.url, parsed.timeoutMs);
    if (validated.status !== "valid") {
      return { status: "rejected", reason: validated.reason };
    }
    const normalizedUrl = validated.normalizedUrl;

    const library = store.getLibrary();
    const existing = library.videos.find((video) => video.sourceUrl === normalizedUrl);
    if (existing) {
      const refreshed: VideoItem = {
        ...existing,
        lastValidatedAt: validated.validatedAt,
      };
      store.saveLibrary({
        ...library,
        videos: library.videos.map((video) => (video.id === existing.id ? refreshed : video)),
      });
      return { status: "registered", video: refreshed };
    }

    const video: VideoItem = {
      id: createVideoId(),
      label: parsed.label?.trim() || new URL(normalizedUrl).pathname.split("/").pop() || normalizedUrl,
      sourceUrl: normalizedUrl,
      lastValidatedAt: new Date().toISOString(),
      addedByPluginId: parsed.pluginId,
    };

    store.saveLibrary({
      ...library,
      videos: [...library.videos, video],
    });

    return { status: "registered", video };
  });

  ipcMain.handle("plugins:list", () => pluginManager.list());
  ipcMain.handle("plugins:panels", () => pluginManager.getInputPanels());
  ipcMain.handle("plugins:enable", (_event, payload) => {
    const parsed = pluginEnableSchema.parse(payload);
    return pluginManager.enable(parsed.pluginId, parsed.enabled);
  });
  ipcMain.handle("plugins:reorder", (_event, payload) => {
    const parsed = pluginReorderSchema.parse(payload);
    return pluginManager.reorder(parsed.orderedIds);
  });
  ipcMain.handle("plugins:remove", (_event, payload) => {
    const parsed = pluginRemoveSchema.parse(payload);
    return pluginManager.remove(parsed.pluginId);
  });
  ipcMain.handle("plugins:update", (_event, payload) => {
    const parsed = pluginRemoveSchema.parse(payload);
    return pluginManager.update(parsed.pluginId);
  });
  ipcMain.handle("plugins:installFromZip", (_event, payload) => {
    const parsed = pathPayloadSchema.parse(payload);
    return pluginManager.installFromZip(parsed.path);
  });
  ipcMain.handle("plugins:installFromFolder", (_event, payload) => {
    const parsed = pathPayloadSchema.parse(payload);
    return pluginManager.installFromFolder(parsed.path);
  });
  ipcMain.handle("plugins:installFromGit", (_event, payload) => {
    const parsed = gitInstallPayloadSchema.parse(payload);
    return pluginManager.installFromGit(parsed);
  });
  ipcMain.handle("plugins:resolveInput", (_event, payload) => {
    const parsed = pluginResolveInputSchema.parse(payload);
    return pluginManager.resolveInput(parsed.pluginId, parsed.input, parsed.timeoutMs);
  });

  ipcMain.handle("plugins:pickZip", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: "プラグインzipを選択",
      properties: ["openFile"],
      filters: [{ name: "Zip", extensions: ["zip"] }],
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  ipcMain.handle("plugins:pickFolder", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: "プラグインフォルダを選択",
      properties: ["openDirectory"],
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  ipcMain.handle("player:saveResume", (_event, payload) => {
    const parsed = resumeSaveSchema.parse(payload);
    return store.saveResume(parsed);
  });

  ipcMain.handle("player:getResume", (_event, payload) => {
    const parsed = resumeGetSchema.parse(payload);
    return store.getResume(parsed.videoId);
  });

  ipcMain.handle("videoSource:exportAlive", async (event) => {
    const library = store.getLibrary();
    const aliveUrls = [...new Set(library.videos.map((video) => video.sourceUrl))];

    if (aliveUrls.length === 0) {
      return { status: "empty" as const };
    }

    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes(),
    ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const defaultPath = `alive_urls_${stamp}.txt`;

    const options: SaveDialogOptions = {
      title: "生存URLをエクスポート",
      defaultPath,
      filters: [{ name: "Text", extensions: ["txt"] }],
    };
    const result = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options);

    if (result.canceled || !result.filePath) {
      return { status: "cancelled" as const };
    }

    const content = `${aliveUrls.join("\n")}\n`;
    await writeFile(result.filePath, content, "utf-8");

    return {
      status: "success" as const,
      path: result.filePath,
      count: aliveUrls.length,
    };
  });

  ipcMain.handle("app:getVersion", () => app.getVersion());

  ipcMain.handle("fs:readTextFile", async (_event, payload) => {
    const parsed = readTextFileSchema.parse(payload);
    return readFile(parsed.path, "utf-8");
  });

  ipcMain.handle("fs:writeTextFile", async (_event, payload) => {
    const parsed = writeTextFileSchema.parse(payload);
    await writeFile(parsed.path, parsed.content, "utf-8");
    return { ok: true as const };
  });

  ipcMain.handle("fs:pickOpenFile", async (event, payload) => {
    const parsed = pickPathSchema.parse(payload ?? {});
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: parsed.title ?? "ファイルを選択",
      properties: ["openFile"],
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  ipcMain.handle("fs:pickDirectory", async (event, payload) => {
    const parsed = pickPathSchema.parse(payload ?? {});
    const win = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: parsed.title ?? "フォルダを選択",
      properties: ["openDirectory"],
    };
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
}

export function cleanupIpcHandlers(): void {
  ipcMain.removeHandler("settings:get");
  ipcMain.removeHandler("settings:save");
  ipcMain.removeHandler("library:get");
  ipcMain.removeHandler("library:save");
  ipcMain.removeHandler("videoSource:validate");
  ipcMain.removeHandler("videoSource:register");
  ipcMain.removeHandler("plugins:list");
  ipcMain.removeHandler("plugins:panels");
  ipcMain.removeHandler("plugins:enable");
  ipcMain.removeHandler("plugins:reorder");
  ipcMain.removeHandler("plugins:remove");
  ipcMain.removeHandler("plugins:update");
  ipcMain.removeHandler("plugins:installFromZip");
  ipcMain.removeHandler("plugins:installFromFolder");
  ipcMain.removeHandler("plugins:installFromGit");
  ipcMain.removeHandler("plugins:resolveInput");
  ipcMain.removeHandler("plugins:pickZip");
  ipcMain.removeHandler("plugins:pickFolder");
  ipcMain.removeHandler("player:saveResume");
  ipcMain.removeHandler("player:getResume");
  ipcMain.removeHandler("videoSource:exportAlive");
  ipcMain.removeHandler("app:getVersion");
  ipcMain.removeHandler("fs:readTextFile");
  ipcMain.removeHandler("fs:writeTextFile");
  ipcMain.removeHandler("fs:pickOpenFile");
  ipcMain.removeHandler("fs:pickDirectory");
}
