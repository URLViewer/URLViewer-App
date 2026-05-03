import { AppSettings, GroupItem, LibraryState, PluginState } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  restoreTabsOnLaunch: true,
  validationMode: "on-register",
  validationConcurrency: 2,
  validationTimeoutMs: 5000,
};

export const FAVORITES_GROUP_ID = "builtin:favorites";

export const FAVORITES_GROUP: GroupItem = {
  id: FAVORITES_GROUP_ID,
  name: "お気に入り",
  videoIds: [],
  locked: true,
  builtin: "favorites",
};

export const DEFAULT_LIBRARY: LibraryState = {
  videos: [],
  groups: [{ ...FAVORITES_GROUP }],
  tabs: {
    openVideoIds: [],
    activeVideoId: null,
  },
};

export const DEFAULT_PLUGIN_STATE: PluginState = {
  schemaVersion: 1,
  items: [],
};
