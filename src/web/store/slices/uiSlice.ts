import { ensureActiveTab, ensureFavoritesGroup } from "@web/store/libraryHelpers";
import { DEFAULT_UI_STATE } from "@shared/defaults";
import type { AppState, AppStoreGet, AppStoreSet } from "@web/store/appStoreTypes";
import type { LibraryState } from "@shared/types";

type UiActions = Pick<
  AppState,
  | "loadInitialData"
  | "setUrlInput"
  | "setPluginInput"
  | "saveSettings"
  | "setPanel"
  | "setPlaybackState"
  | "requestPlaybackCommand"
  | "setLibrarySort"
  | "toggleLibrarySortOrder"
  | "setLibrarySelectionMode"
  | "toggleVideoSelection"
  | "selectAllVideos"
  | "clearSelectedVideos"
  | "setGroupSelectionMode"
  | "toggleGroupSelection"
  | "selectAllGroups"
  | "clearSelectedGroups"
  | "appendLog"
  | "clearLogs"
>;

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

export function createUiActions(set: AppStoreSet, get: AppStoreGet): UiActions {
  return {
    async loadInitialData() {
      const [settings, library, ui, plugins, pluginPanels, appVersion] = await Promise.all([
        window.m3u8Viewer.settings.get(),
        window.m3u8Viewer.library.get(),
        window.m3u8Viewer.ui.get(),
        window.m3u8Viewer.plugins.list(),
        window.m3u8Viewer.plugins.listPanels(),
        window.m3u8Viewer.app.getVersion(),
      ]);

      const normalizedLibrary = ensureFavoritesGroup(library);
      const tabsPreparedLibrary = settings.restoreTabsOnLaunch
        ? normalizedLibrary
        : {
            ...normalizedLibrary,
            tabs: {
              openVideoIds: [],
              activeVideoId: null,
            },
          };
      const preparedLibrary = settings.restorePlaybackOnLaunch
        ? tabsPreparedLibrary
        : stripResumeFromLibrary(tabsPreparedLibrary);

      set({
        loaded: true,
        settings,
        library: ensureActiveTab(preparedLibrary),
        librarySortKey: settings.restoreLibrarySortOnLaunch ? ui.librarySortKey : DEFAULT_UI_STATE.librarySortKey,
        librarySortOrder: settings.restoreLibrarySortOnLaunch ? ui.librarySortOrder : DEFAULT_UI_STATE.librarySortOrder,
        plugins,
        pluginPanels,
        appVersion,
      });
    },

    setUrlInput(input) {
      set({ urlInput: input });
    },

    setPluginInput(pluginId, input) {
      set((state) => ({
        pluginInput: {
          ...state.pluginInput,
          [pluginId]: input,
        },
      }));
    },

    async saveSettings(settings) {
      const nextSettings = await window.m3u8Viewer.settings.save(settings);
      if (!nextSettings.restoreLibrarySortOnLaunch) {
        set({
          librarySortKey: DEFAULT_UI_STATE.librarySortKey,
          librarySortOrder: DEFAULT_UI_STATE.librarySortOrder,
        });
      }
      set((state) => ({
        settings: nextSettings,
        lastMessage: "設定を保存しました。",
        activityLogs: [
          {
            id: (state.activityLogs[0]?.id ?? 0) + 1,
            at: new Date().toISOString(),
            level: "success" as const,
            scope: "settings",
            message: "設定を保存しました。",
          },
          ...state.activityLogs,
        ].slice(0, 300),
      }));
    },

    setPanel(panel) {
      set({ currentPanel: panel });
    },

    setPlaybackState(playback) {
      set({ playback });
    },

    requestPlaybackCommand(videoId, action) {
      set((state) => ({
        playbackCommand: {
          videoId,
          action,
          seq: (state.playbackCommand?.seq ?? 0) + 1,
        },
      }));
    },

    async setLibrarySort(key) {
      set({ librarySortKey: key });
      const { settings, librarySortOrder } = get();
      if (!settings.restoreLibrarySortOnLaunch) {
        return;
      }
      await window.m3u8Viewer.ui.save({
        librarySortKey: key,
        librarySortOrder,
      });
    },

    async toggleLibrarySortOrder() {
      const nextOrder = get().librarySortOrder === "asc" ? "desc" : "asc";
      set({ librarySortOrder: nextOrder });
      const { settings, librarySortKey } = get();
      if (!settings.restoreLibrarySortOnLaunch) {
        return;
      }
      await window.m3u8Viewer.ui.save({
        librarySortKey,
        librarySortOrder: nextOrder,
      });
    },

    setLibrarySelectionMode(enabled) {
      set((state) => ({
        librarySelectionMode: enabled,
        selectedVideoIds: enabled ? state.selectedVideoIds : [],
      }));
    },

    toggleVideoSelection(videoId) {
      set((state) => {
        const selected = new Set(state.selectedVideoIds);
        if (selected.has(videoId)) {
          selected.delete(videoId);
        } else {
          selected.add(videoId);
        }
        return { selectedVideoIds: [...selected] };
      });
    },

    selectAllVideos() {
      set((state) => ({ selectedVideoIds: state.library.videos.map((video) => video.id) }));
    },

    clearSelectedVideos() {
      set({ selectedVideoIds: [] });
    },

    setGroupSelectionMode(enabled) {
      set((state) => ({
        groupSelectionMode: enabled,
        selectedGroupIds: enabled ? state.selectedGroupIds : [],
      }));
    },

    toggleGroupSelection(groupId) {
      set((state) => {
        const selected = new Set(state.selectedGroupIds);
        if (selected.has(groupId)) {
          selected.delete(groupId);
        } else {
          selected.add(groupId);
        }
        return { selectedGroupIds: [...selected] };
      });
    },

    selectAllGroups() {
      set((state) => ({ selectedGroupIds: state.library.groups.map((group) => group.id) }));
    },

    clearSelectedGroups() {
      set({ selectedGroupIds: [] });
    },

    appendLog(entry) {
      set((state) => ({
        activityLogs: [
          {
            ...entry,
            id: (state.activityLogs[0]?.id ?? 0) + 1,
            at: new Date().toISOString(),
          },
          ...state.activityLogs,
        ].slice(0, 300),
      }));
    },

    clearLogs() {
      set({ activityLogs: [] });
    },
  };
}
