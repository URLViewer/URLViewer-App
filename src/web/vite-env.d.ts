import type {
  AppSettings,
  ExportAliveUrlsResult,
  GitInstallPayload,
  InstallPluginResult,
  LibraryState,
  PluginListItem,
  RegisterVideoSourceInput,
  RegisterVideoSourceResult,
  ResumePayload,
  VideoSourceValidateInput,
  VideoSourceValidateResult,
} from "@shared/types";

declare global {
  interface Window {
    m3u8Viewer: {
      settings: {
        get: () => Promise<AppSettings>;
        save: (settings: AppSettings) => Promise<AppSettings>;
      };
      library: {
        get: () => Promise<LibraryState>;
        save: (library: LibraryState) => Promise<LibraryState>;
      };
      videoSource: {
        validate: (payload: VideoSourceValidateInput) => Promise<VideoSourceValidateResult>;
        register: (payload: RegisterVideoSourceInput) => Promise<RegisterVideoSourceResult>;
        exportAlive: () => Promise<ExportAliveUrlsResult>;
      };
      plugins: {
        list: () => Promise<PluginListItem[]>;
        listPanels: () => Promise<PluginListItem[]>;
        setEnabled: (pluginId: string, enabled: boolean) => Promise<PluginListItem[]>;
        reorder: (orderedIds: string[]) => Promise<PluginListItem[]>;
        remove: (pluginId: string) => Promise<PluginListItem[]>;
        update: (pluginId: string) => Promise<PluginListItem[]>;
        installFromZip: (path: string) => Promise<InstallPluginResult>;
        installFromFolder: (path: string) => Promise<InstallPluginResult>;
        installFromGit: (payload: GitInstallPayload) => Promise<InstallPluginResult>;
        resolveInput: (pluginId: string, input: string, timeoutMs: number) => Promise<string[]>;
        pickZip: () => Promise<string | null>;
        pickFolder: () => Promise<string | null>;
      };
      player: {
        saveResume: (payload: ResumePayload) => Promise<number>;
        getResume: (videoId: string) => Promise<number | null>;
      };
      app: {
        getVersion: () => Promise<string>;
        onCloseActiveTabShortcut: (callback: () => void) => () => void;
      };
      fs: {
        readTextFile: (path: string) => Promise<string>;
        writeTextFile: (path: string, content: string) => Promise<{ ok: true }>;
        pickOpenFile: (title?: string) => Promise<string | null>;
        pickDirectory: (title?: string) => Promise<string | null>;
      };
    };
  }
}

export {};
