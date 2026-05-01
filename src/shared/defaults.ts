import { AppSettings, LibraryState, PluginState } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  restoreTabsOnLaunch: true,
  validationMode: "on-register",
  validationConcurrency: 2,
  validationTimeoutMs: 5000,
};

export const DEFAULT_LIBRARY: LibraryState = {
  videos: [],
  groups: [],
  tabs: {
    openVideoIds: [],
    activeVideoId: null,
  },
};

export const DEFAULT_PLUGIN_STATE: PluginState = {
  schemaVersion: 1,
  items: [],
};

