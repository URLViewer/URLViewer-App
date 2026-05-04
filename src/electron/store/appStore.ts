import { app } from "electron";
import path from "node:path";
import process from "node:process";
import Store from "electron-store";
import {
  DEFAULT_LIBRARY,
  DEFAULT_PLUGIN_STATE,
  DEFAULT_SETTINGS,
  DEFAULT_UI_STATE,
  FAVORITES_GROUP_ID,
} from "@shared/defaults";
import {
  appSettingsSchema,
  libraryStateSchema,
  pluginStateSchema,
  resumePayloadSchema,
  uiStateSchema,
} from "@shared/schemas";
import type {
  AppSettings,
  LibraryState,
  PluginState,
  ResumePayload,
  UiState,
  VideoItem,
} from "@shared/types";

type PersistedState = {
  dataVersion: 4;
  settings: AppSettings;
  library: LibraryState;
  plugins: PluginState;
  ui: UiState;
};

const STORE_NAME = "m3u8-viewer";
const DATA_VERSION = 4;

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

function stripResumeFromLibrary(library: LibraryState): LibraryState {
  return {
    ...library,
    videos: library.videos.map((video) => {
      const { resumeSeconds, ...rest } = video;
      void resumeSeconds;
      return rest;
    }),
  };
}

function sanitizeLibraryForPersistence(library: LibraryState, settings: AppSettings): LibraryState {
  const withTabs = settings.restoreTabsOnLaunch
    ? library
    : {
        ...library,
        tabs: {
          openVideoIds: [],
          activeVideoId: null,
        },
      };
  return settings.restorePlaybackOnLaunch ? withTabs : stripResumeFromLibrary(withTabs);
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
      ui: DEFAULT_UI_STATE,
    },
  });

  constructor() {
    this.resetIfLegacyData();
  }

  private resetIfLegacyData(): void {
    const version = this.store.get("dataVersion");
    const settings = this.getSettings();
    const library = this.getLibrary();

    if (version !== DATA_VERSION) {
      this.store.set("dataVersion", DATA_VERSION);
      this.store.set("plugins", DEFAULT_PLUGIN_STATE);
      this.store.set("ui", DEFAULT_UI_STATE);
    }
    this.store.set("library", sanitizeLibraryForPersistence(library, settings));
  }

  getSettings(): AppSettings {
    const parsed = appSettingsSchema.safeParse(this.store.get("settings"));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  }

  saveSettings(next: AppSettings): AppSettings {
    const parsed = appSettingsSchema.parse(next);
    this.store.set("settings", parsed);
    this.store.set("library", sanitizeLibraryForPersistence(this.getLibrary(), parsed));
    if (!parsed.restoreLibrarySortOnLaunch) {
      this.store.set("ui", DEFAULT_UI_STATE);
    }
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
    const settings = this.getSettings();
    const parsed = libraryStateSchema.parse(
      sanitizeLibraryForPersistence(normalizeLibrary(next), settings),
    );
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
    const settings = this.getSettings();
    if (!settings.restorePlaybackOnLaunch) {
      return payload.seconds;
    }
    const parsed = resumePayloadSchema.parse(payload);
    const library = this.getLibrary();
    const updatedVideos: VideoItem[] = library.videos.map((video) =>
      video.id === parsed.videoId ? { ...video, resumeSeconds: parsed.seconds } : video,
    );

    this.saveLibrary({ ...library, videos: updatedVideos });
    return parsed.seconds;
  }

  getResume(videoId: string): number | null {
    const settings = this.getSettings();
    if (!settings.restorePlaybackOnLaunch) {
      return null;
    }
    const library = this.getLibrary();
    const found = library.videos.find((video) => video.id === videoId);
    return found?.resumeSeconds ?? null;
  }

  getUiState(): UiState {
    const parsed = uiStateSchema.safeParse(this.store.get("ui"));
    return parsed.success ? parsed.data : DEFAULT_UI_STATE;
  }

  saveUiState(next: UiState): UiState {
    const settings = this.getSettings();
    if (!settings.restoreLibrarySortOnLaunch) {
      this.store.set("ui", DEFAULT_UI_STATE);
      return DEFAULT_UI_STATE;
    }
    const parsed = uiStateSchema.parse(next);
    this.store.set("ui", parsed);
    return parsed;
  }
}
