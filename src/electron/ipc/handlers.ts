import electron from "electron";
import type { OpenDialogOptions, SaveDialogOptions } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  appSettingsSchema,
  gitInstallPayloadSchema,
  libraryStateSchema,
  pluginEnableSchema,
  pluginRemoveSchema,
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
  electron.ipcMain.handle("settings:get", () => store.getSettings());

  electron.ipcMain.handle("settings:save", (_event, payload) => {
    const parsed = appSettingsSchema.parse(payload);
    return store.saveSettings(parsed);
  });

  electron.ipcMain.handle("library:get", () => store.getLibrary());

  electron.ipcMain.handle("library:save", (_event, payload) => {
    const parsed = libraryStateSchema.parse(payload);
    return store.saveLibrary(parsed);
  });

  electron.ipcMain.handle("videoSource:validate", async (_event, payload) => {
    const parsed = validateVideoSourceSchema.parse(payload);
    return validateVideoSourceUrl(parsed.url, parsed.timeoutMs);
  });

  electron.ipcMain.handle("videoSource:register", async (_event, payload): Promise<RegisterVideoSourceResult> => {
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

  electron.ipcMain.handle("plugins:list", () => pluginManager.list());
  electron.ipcMain.handle("plugins:panels", () => pluginManager.getInputPanels());
  electron.ipcMain.handle("plugins:enable", (_event, payload) => {
    const parsed = pluginEnableSchema.parse(payload);
    return pluginManager.enable(parsed.pluginId, parsed.enabled);
  });
  electron.ipcMain.handle("plugins:reorder", (_event, payload) => {
    const parsed = pluginReorderSchema.parse(payload);
    return pluginManager.reorder(parsed.orderedIds);
  });
  electron.ipcMain.handle("plugins:remove", (_event, payload) => {
    const parsed = pluginRemoveSchema.parse(payload);
    return pluginManager.remove(parsed.pluginId);
  });
  electron.ipcMain.handle("plugins:update", (_event, payload) => {
    const parsed = pluginRemoveSchema.parse(payload);
    return pluginManager.update(parsed.pluginId);
  });
  electron.ipcMain.handle("plugins:installFromZip", (_event, payload) => {
    const parsed = pathPayloadSchema.parse(payload);
    return pluginManager.installFromZip(parsed.path);
  });
  electron.ipcMain.handle("plugins:installFromFolder", (_event, payload) => {
    const parsed = pathPayloadSchema.parse(payload);
    return pluginManager.installFromFolder(parsed.path);
  });
  electron.ipcMain.handle("plugins:installFromGit", (_event, payload) => {
    const parsed = gitInstallPayloadSchema.parse(payload);
    return pluginManager.installFromGit(parsed);
  });

  electron.ipcMain.handle("plugins:pickZip", async (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: "プラグインzipを選択",
      properties: ["openFile"],
      filters: [{ name: "Zip", extensions: ["zip"] }],
    };
    const result = win
      ? await electron.dialog.showOpenDialog(win, options)
      : await electron.dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  electron.ipcMain.handle("plugins:pickFolder", async (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: "プラグインフォルダを選択",
      properties: ["openDirectory"],
    };
    const result = win
      ? await electron.dialog.showOpenDialog(win, options)
      : await electron.dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  electron.ipcMain.handle("player:saveResume", (_event, payload) => {
    const parsed = resumeSaveSchema.parse(payload);
    return store.saveResume(parsed);
  });

  electron.ipcMain.handle("player:getResume", (_event, payload) => {
    const parsed = resumeGetSchema.parse(payload);
    return store.getResume(parsed.videoId);
  });

  electron.ipcMain.handle("videoSource:exportAlive", async (event) => {
    const library = store.getLibrary();
    const aliveUrls = [...new Set(library.videos.map((video) => video.sourceUrl))];

    if (aliveUrls.length === 0) {
      return { status: "empty" as const };
    }

    const win = electron.BrowserWindow.fromWebContents(event.sender) ?? undefined;
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
      ? await electron.dialog.showSaveDialog(win, options)
      : await electron.dialog.showSaveDialog(options);

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

  electron.ipcMain.handle("app:getVersion", () => electron.app.getVersion());

  electron.ipcMain.handle("fs:readTextFile", async (_event, payload) => {
    const parsed = readTextFileSchema.parse(payload);
    return readFile(parsed.path, "utf-8");
  });

  electron.ipcMain.handle("fs:writeTextFile", async (_event, payload) => {
    const parsed = writeTextFileSchema.parse(payload);
    await writeFile(parsed.path, parsed.content, "utf-8");
    return { ok: true as const };
  });

  electron.ipcMain.handle("fs:pickOpenFile", async (event, payload) => {
    const parsed = pickPathSchema.parse(payload ?? {});
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: parsed.title ?? "ファイルを選択",
      properties: ["openFile"],
    };
    const result = win
      ? await electron.dialog.showOpenDialog(win, options)
      : await electron.dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  electron.ipcMain.handle("fs:pickDirectory", async (event, payload) => {
    const parsed = pickPathSchema.parse(payload ?? {});
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: parsed.title ?? "フォルダを選択",
      properties: ["openDirectory"],
    };
    const result = win
      ? await electron.dialog.showOpenDialog(win, options)
      : await electron.dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
}

export function cleanupIpcHandlers(): void {
  electron.ipcMain.removeHandler("settings:get");
  electron.ipcMain.removeHandler("settings:save");
  electron.ipcMain.removeHandler("library:get");
  electron.ipcMain.removeHandler("library:save");
  electron.ipcMain.removeHandler("videoSource:validate");
  electron.ipcMain.removeHandler("videoSource:register");
  electron.ipcMain.removeHandler("plugins:list");
  electron.ipcMain.removeHandler("plugins:panels");
  electron.ipcMain.removeHandler("plugins:enable");
  electron.ipcMain.removeHandler("plugins:reorder");
  electron.ipcMain.removeHandler("plugins:remove");
  electron.ipcMain.removeHandler("plugins:update");
  electron.ipcMain.removeHandler("plugins:installFromZip");
  electron.ipcMain.removeHandler("plugins:installFromFolder");
  electron.ipcMain.removeHandler("plugins:installFromGit");
  electron.ipcMain.removeHandler("plugins:pickZip");
  electron.ipcMain.removeHandler("plugins:pickFolder");
  electron.ipcMain.removeHandler("player:saveResume");
  electron.ipcMain.removeHandler("player:getResume");
  electron.ipcMain.removeHandler("videoSource:exportAlive");
  electron.ipcMain.removeHandler("app:getVersion");
  electron.ipcMain.removeHandler("fs:readTextFile");
  electron.ipcMain.removeHandler("fs:writeTextFile");
  electron.ipcMain.removeHandler("fs:pickOpenFile");
  electron.ipcMain.removeHandler("fs:pickDirectory");
}
