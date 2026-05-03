import { ensureActiveTab, ensureFavoritesGroup } from "@web/store/libraryHelpers";
import type { AppState, AppStoreSet } from "@web/store/appStoreTypes";

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

export function createUiActions(set: AppStoreSet): UiActions {
  return {
    async loadInitialData() {
      const [settings, library, plugins, pluginPanels, appVersion] = await Promise.all([
        window.m3u8Viewer.settings.get(),
        window.m3u8Viewer.library.get(),
        window.m3u8Viewer.plugins.list(),
        window.m3u8Viewer.plugins.listPanels(),
        window.m3u8Viewer.app.getVersion(),
      ]);

      const normalizedLibrary = ensureFavoritesGroup(library);
      const preparedLibrary = settings.restoreTabsOnLaunch
        ? normalizedLibrary
        : {
            ...normalizedLibrary,
            tabs: {
              openVideoIds: [],
              activeVideoId: null,
            },
          };

      set({
        loaded: true,
        settings,
        library: ensureActiveTab(preparedLibrary),
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

    setLibrarySort(key) {
      set({ librarySortKey: key });
    },

    toggleLibrarySortOrder() {
      set((state) => ({
        librarySortOrder: state.librarySortOrder === "asc" ? "desc" : "asc",
      }));
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
