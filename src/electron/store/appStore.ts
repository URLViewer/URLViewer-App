import { app } from "electron";
import path from "node:path";
import process from "node:process";
import Store from "electron-store";
import { DEFAULT_LIBRARY, DEFAULT_PLUGIN_STATE, DEFAULT_SETTINGS } from "@shared/defaults";
import {
  appSettingsSchema,
  libraryStateSchema,
  pluginStateSchema,
  resumePayloadSchema,
} from "@shared/schemas";
import type {
  AppSettings,
  LibraryState,
  PluginState,
  ResumePayload,
  VideoItem,
} from "@shared/types";

type PersistedState = {
  dataVersion: 2;
  settings: AppSettings;
  library: LibraryState;
  plugins: PluginState;
};

const STORE_NAME = "m3u8-viewer";
const DATA_VERSION = 2;

function resolveStoreCwd(): string {
  try {
    const userDataPath = app?.getPath?.("userData");
    if (userDataPath) {
      return userDataPath;
    }
  } catch {
    // ignore and fallback
  }

  return path.join(process.cwd(), ".m3u8-viewer-data");
}

export class AppStoreService {
  private store = new Store<PersistedState>({
    name: STORE_NAME,
    cwd: resolveStoreCwd(),
    defaults: {
      dataVersion: DATA_VERSION,
      settings: DEFAULT_SETTINGS,
      library: DEFAULT_LIBRARY,
      plugins: DEFAULT_PLUGIN_STATE,
    },
  });

  constructor() {
    this.resetIfLegacyData();
  }

  private resetIfLegacyData(): void {
    const version = this.store.get("dataVersion");
    if (version === DATA_VERSION) {
      return;
    }

    this.store.set("dataVersion", DATA_VERSION);
    this.store.set("library", DEFAULT_LIBRARY);
    this.store.set("plugins", DEFAULT_PLUGIN_STATE);
  }

  getSettings(): AppSettings {
    const parsed = appSettingsSchema.safeParse(this.store.get("settings"));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  }

  saveSettings(next: AppSettings): AppSettings {
    const parsed = appSettingsSchema.parse(next);
    this.store.set("settings", parsed);
    return parsed;
  }

  getLibrary(): LibraryState {
    const parsed = libraryStateSchema.safeParse(this.store.get("library"));
    if (parsed.success) {
      return parsed.data;
    }

    this.store.set("library", DEFAULT_LIBRARY);
    return DEFAULT_LIBRARY;
  }

  saveLibrary(next: LibraryState): LibraryState {
    const parsed = libraryStateSchema.parse(next);
    this.store.set("library", parsed);
    return parsed;
  }

  getPlugins(): PluginState {
    const parsed = pluginStateSchema.safeParse(this.store.get("plugins"));
    if (parsed.success) {
      return parsed.data;
    }

    this.store.set("plugins", DEFAULT_PLUGIN_STATE);
    return DEFAULT_PLUGIN_STATE;
  }

  savePlugins(next: PluginState): PluginState {
    const parsed = pluginStateSchema.parse(next);
    this.store.set("plugins", parsed);
    return parsed;
  }

  saveResume(payload: ResumePayload): number {
    const parsed = resumePayloadSchema.parse(payload);
    const library = this.getLibrary();
    const updatedVideos: VideoItem[] = library.videos.map((video) =>
      video.id === parsed.videoId ? { ...video, resumeSeconds: parsed.seconds } : video,
    );

    this.saveLibrary({ ...library, videos: updatedVideos });
    return parsed.seconds;
  }

  getResume(videoId: string): number | null {
    const library = this.getLibrary();
    const found = library.videos.find((video) => video.id === videoId);
    return found?.resumeSeconds ?? null;
  }
}
