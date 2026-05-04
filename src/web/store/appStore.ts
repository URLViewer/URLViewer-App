import { create } from "zustand";
import { DEFAULT_LIBRARY, DEFAULT_SETTINGS } from "@shared/defaults";
import { createEmptyValidationQueue } from "@web/store/validationHelpers";
import type { AppState } from "@web/store/appStoreTypes";
import { createPluginActions } from "@web/store/slices/pluginSlice";
import { createRegistrationActions } from "@web/store/slices/registrationSlice";
import { createLibraryActions } from "@web/store/slices/librarySlice";
import { createUiActions } from "@web/store/slices/uiSlice";

export const useAppStore = create<AppState>((set, get) => ({
  loaded: false,
  settings: DEFAULT_SETTINGS,
  library: DEFAULT_LIBRARY,
  plugins: [],
  pluginPanels: [],
  currentPanel: "input",
  urlInput: "",
  pluginInput: {},
  appVersion: "",
  busy: false,
  lastMessage: "",
  validationQueue: createEmptyValidationQueue(),
  pendingValidations: [],
  playback: {
    videoId: null,
    status: "idle",
  },
  playbackCommand: null,
  librarySortKey: "name",
  librarySortOrder: "asc",
  librarySelectionMode: false,
  groupSelectionMode: false,
  selectedVideoIds: [],
  selectedGroupIds: [],
  activityLogs: [],

  ...createUiActions(set, get),
  ...createRegistrationActions(set, get),
  ...createPluginActions(set, get),
  ...createLibraryActions(set, get),
}));
