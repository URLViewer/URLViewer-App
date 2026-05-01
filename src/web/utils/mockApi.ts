import { DEFAULT_LIBRARY, DEFAULT_SETTINGS } from "@shared/defaults";
import { BUILTIN_PLUGIN_SEEDS } from "@shared/pluginCatalog";
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

let settingsState: AppSettings = { ...DEFAULT_SETTINGS };
let libraryState: LibraryState = JSON.parse(JSON.stringify(DEFAULT_LIBRARY)) as LibraryState;
let pluginsState: PluginListItem[] = JSON.parse(
  JSON.stringify(BUILTIN_PLUGIN_SEEDS),
) as PluginListItem[];

function validate(payload: VideoSourceValidateInput): VideoSourceValidateResult {
  try {
    const parsed = new URL(payload.url);
    return {
      status: "valid",
      normalizedUrl: parsed.toString(),
      validatedAt: new Date().toISOString(),
    };
  } catch {
    return { status: "invalid", reason: "invalid-url" };
  }
}

function register(payload: RegisterVideoSourceInput): RegisterVideoSourceResult {
  const checked = validate({ url: payload.url, timeoutMs: payload.timeoutMs });
  if (checked.status !== "valid") {
    return { status: "rejected", reason: checked.reason };
  }

  const existing = libraryState.videos.find((video) => video.sourceUrl === checked.normalizedUrl);
  if (existing) {
    return { status: "registered", video: existing };
  }

  const video = {
    id: crypto.randomUUID(),
    label: payload.label?.trim() || checked.normalizedUrl,
    sourceUrl: checked.normalizedUrl,
    lastValidatedAt: checked.validatedAt,
    addedByPluginId: payload.pluginId,
  };
  libraryState = {
    ...libraryState,
    videos: [...libraryState.videos, video],
  };
  return { status: "registered", video };
}

function exportAlive(): ExportAliveUrlsResult {
  const alive = [...new Set(libraryState.videos.map((video) => video.sourceUrl))];
  if (alive.length === 0) {
    return { status: "empty" };
  }
  return { status: "success", path: "mock://alive_urls.txt", count: alive.length };
}

export function createBrowserMockApi(): Window["m3u8Viewer"] {
  return {
    settings: {
      get: async () => settingsState,
      save: async (next) => {
        settingsState = next;
        return settingsState;
      },
    },
    library: {
      get: async () => libraryState,
      save: async (next) => {
        libraryState = next;
        return libraryState;
      },
    },
    videoSource: {
      validate: async (payload) => validate(payload),
      register: async (payload) => register(payload),
      exportAlive: async () => exportAlive(),
    },
    plugins: {
      list: async () => pluginsState,
      listPanels: async () => pluginsState.filter((plugin) => plugin.enabled && plugin.panel),
      setEnabled: async (pluginId, enabled) => {
        pluginsState = pluginsState.map((plugin) =>
          plugin.id === pluginId ? { ...plugin, enabled } : plugin,
        );
        return pluginsState;
      },
      reorder: async () => pluginsState,
      remove: async () => pluginsState,
      update: async () => pluginsState,
      installFromZip: async (): Promise<InstallPluginResult> => ({
        status: "rejected",
        reason: "mock-not-supported",
      }),
      installFromFolder: async (): Promise<InstallPluginResult> => ({
        status: "rejected",
        reason: "mock-not-supported",
      }),
      installFromGit: async (payload: GitInstallPayload): Promise<InstallPluginResult> => {
        void payload;
        return {
          status: "rejected",
          reason: "mock-not-supported",
        };
      },
      pickZip: async () => null,
      pickFolder: async () => null,
    },
    player: {
      saveResume: async (payload: ResumePayload) => payload.seconds,
      getResume: async (videoId: string) => {
        void videoId;
        return null;
      },
    },
    app: {
      getVersion: async () => "0.1.0-browser",
      onCloseActiveTabShortcut: () => () => undefined,
    },
    fs: {
      readTextFile: async (path) => {
        void path;
        return "";
      },
      writeTextFile: async (path, content) => {
        void path;
        void content;
        return { ok: true as const };
      },
      pickOpenFile: async (title) => {
        void title;
        return null;
      },
      pickDirectory: async (title) => {
        void title;
        return null;
      },
    },
  };
}
