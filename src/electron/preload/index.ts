import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  ExportAliveUrlsResult,
  GitInstallPayload,
  InstallPluginResult,
  LibraryState,
  NetworkHeaderOverrideRule,
  PluginListItem,
  RegisterVideoSourceInput,
  RegisterVideoSourceResult,
  ResumePayload,
  UiState,
  VideoPlaybackTraceResult,
  VideoSourceValidateInput,
  VideoSourceValidateResult,
} from "@shared/types";

const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke("settings:get"),
    save: (settings: AppSettings): Promise<AppSettings> =>
      ipcRenderer.invoke("settings:save", settings),
  },
  ui: {
    get: (): Promise<UiState> => ipcRenderer.invoke("ui:get"),
    save: (ui: UiState): Promise<UiState> => ipcRenderer.invoke("ui:save", ui),
  },
  library: {
    get: (): Promise<LibraryState> => ipcRenderer.invoke("library:get"),
    save: (library: LibraryState): Promise<LibraryState> =>
      ipcRenderer.invoke("library:save", library),
  },
  videoSource: {
    validate: (payload: VideoSourceValidateInput): Promise<VideoSourceValidateResult> =>
      ipcRenderer.invoke("videoSource:validate", payload),
    getPlaybackTrace: (url: string): Promise<VideoPlaybackTraceResult> =>
      ipcRenderer.invoke("videoSource:getPlaybackTrace", { url }),
    register: (payload: RegisterVideoSourceInput): Promise<RegisterVideoSourceResult> =>
      ipcRenderer.invoke("videoSource:register", payload),
    exportAlive: (): Promise<ExportAliveUrlsResult> =>
      ipcRenderer.invoke("videoSource:exportAlive"),
  },
  network: {
    acquireHeaderOverride: (rule: NetworkHeaderOverrideRule): Promise<{ ok: true }> =>
      ipcRenderer.invoke("network:acquireHeaderOverride", { rule }),
    releaseHeaderOverride: (id: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("network:releaseHeaderOverride", { id }),
  },
  plugins: {
    list: (): Promise<PluginListItem[]> => ipcRenderer.invoke("plugins:list"),
    listPanels: (): Promise<PluginListItem[]> => ipcRenderer.invoke("plugins:panels"),
    setEnabled: (pluginId: string, enabled: boolean): Promise<PluginListItem[]> =>
      ipcRenderer.invoke("plugins:enable", { pluginId, enabled }),
    reorder: (orderedIds: string[]): Promise<PluginListItem[]> =>
      ipcRenderer.invoke("plugins:reorder", { orderedIds }),
    remove: (pluginId: string): Promise<PluginListItem[]> =>
      ipcRenderer.invoke("plugins:remove", { pluginId }),
    update: (pluginId: string): Promise<PluginListItem[]> =>
      ipcRenderer.invoke("plugins:update", { pluginId }),
    installFromZip: (path: string): Promise<InstallPluginResult> =>
      ipcRenderer.invoke("plugins:installFromZip", { path }),
    installFromFolder: (path: string): Promise<InstallPluginResult> =>
      ipcRenderer.invoke("plugins:installFromFolder", { path }),
    installFromGit: (payload: GitInstallPayload): Promise<InstallPluginResult> =>
      ipcRenderer.invoke("plugins:installFromGit", payload),
    resolveInput: (pluginId: string, input: string, timeoutMs: number): Promise<string[]> =>
      ipcRenderer.invoke("plugins:resolveInput", { pluginId, input, timeoutMs }),
    pickZip: (): Promise<string | null> => ipcRenderer.invoke("plugins:pickZip"),
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke("plugins:pickFolder"),
  },
  player: {
    saveResume: (payload: ResumePayload): Promise<number> =>
      ipcRenderer.invoke("player:saveResume", payload),
    getResume: (videoId: string): Promise<number | null> =>
      ipcRenderer.invoke("player:getResume", { videoId }),
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
    onCloseActiveTabShortcut: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on("app:close-active-tab", handler);
      return () => {
        ipcRenderer.removeListener("app:close-active-tab", handler);
      };
    },
  },
  fs: {
    readTextFile: (path: string): Promise<string> => ipcRenderer.invoke("fs:readTextFile", { path }),
    writeTextFile: (path: string, content: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("fs:writeTextFile", { path, content }),
    pickOpenFile: (title?: string): Promise<string | null> =>
      ipcRenderer.invoke("fs:pickOpenFile", { title }),
    pickDirectory: (title?: string): Promise<string | null> =>
      ipcRenderer.invoke("fs:pickDirectory", { title }),
  },
};

contextBridge.exposeInMainWorld("m3u8Viewer", api);
