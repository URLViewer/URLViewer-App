import { ensureActiveTab } from "@web/store/libraryHelpers";
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

      const preparedLibrary = settings.restoreTabsOnLaunch
        ? library
        : {
            ...library,
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
      set({ settings: nextSettings, lastMessage: "設定を保存しました。" });
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
  };
}
