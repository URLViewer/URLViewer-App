import { app } from "electron";
import path from "node:path";
import process from "node:process";
import Store from "electron-store";
import {
  DEFAULT_LIBRARY,
  DEFAULT_PLUGIN_STATE,
  DEFAULT_SETTINGS,
  FAVORITES_GROUP_ID,
} from "@shared/defaults";
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
  dataVersion: 3;
  settings: AppSettings;
  library: LibraryState;
  plugins: PluginState;
};

const STORE_NAME = "m3u8-viewer";
const DATA_VERSION = 3;

function ensureFavoritesGroup(library: LibraryState): LibraryState {
  const explicitFavorites = library.groups.filter((group) => group.builtin === "favorites");
  const idFavorites = library.groups.filter((group) => group.id === FAVORITES_GROUP_ID);
  const favoriteCandidates = [...explicitFavorites, ...idFavorites];
  const favoriteVideoIds = [...new Set(favoriteCandidates.flatMap((group) => group.videoIds))];

  const nextGroups = library.groups
    .filter((group) => group.id !== FAVORITES_GROUP_ID && group.builtin !== "favorites")
    .map((group) => ({
      ...group,
      locked: Boolean(group.locked),
    }));

  nextGroups.unshift({
    id: FAVORITES_GROUP_ID,
    name: "お気に入り",
    videoIds: favoriteVideoIds,
    locked: true,
    builtin: "favorites",
  });

  return {
    ...library,
    groups: nextGroups,
  };
}

function normalizeLibrary(library: LibraryState): LibraryState {
  return ensureFavoritesGroup({
    ...library,
    videos: library.videos.map((video) => ({
      ...video,
      locked: Boolean(video.locked),
    })),
  });
}

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
    const library = this.getLibrary();

    if (version !== DATA_VERSION) {
      this.store.set("dataVersion", DATA_VERSION);
      this.store.set("plugins", DEFAULT_PLUGIN_STATE);
    }
    this.store.set("library", library);
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
      return normalizeLibrary(parsed.data);
    }

    this.store.set("library", DEFAULT_LIBRARY);
    return DEFAULT_LIBRARY;
  }

  saveLibrary(next: LibraryState): LibraryState {
    const parsed = libraryStateSchema.parse(normalizeLibrary(next));
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
