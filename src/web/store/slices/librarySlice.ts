import {
  buildLibraryForAddGroup,
  buildLibraryForAddGroupWithVideo,
  buildLibraryForAddToGroup,
  buildLibraryForCloseTab,
  buildLibraryForOpenTab,
  buildLibraryForRemoveGroup,
  buildLibraryForRemoveVideo,
  buildLibraryForRenameVideo,
  buildLibraryForSetActiveTab,
  buildLibraryForClearVideos,
} from "@web/store/libraryHelpers";
import type { AppState, AppStoreGet, AppStoreSet } from "@web/store/appStoreTypes";

type LibraryActions = Pick<
  AppState,
  | "openVideoTab"
  | "closeVideoTab"
  | "setActiveTab"
  | "saveResume"
  | "addGroup"
  | "addToGroup"
  | "removeGroup"
  | "removeVideo"
  | "clearAllVideos"
  | "markPlaybackFailed"
  | "renameVideo"
  | "addGroupWithVideo"
>;

export function createLibraryActions(set: AppStoreSet, get: AppStoreGet): LibraryActions {
  return {
    async openVideoTab(videoId) {
      const { library } = get();
      const nextLibrary = buildLibraryForOpenTab(library, videoId);
      if (!nextLibrary) {
        return;
      }

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async closeVideoTab(videoId) {
      const { library } = get();
      const nextLibrary = buildLibraryForCloseTab(library, videoId);

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async setActiveTab(videoId) {
      const { library } = get();
      const nextLibrary = buildLibraryForSetActiveTab(library, videoId);

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async saveResume(videoId, seconds) {
      await window.m3u8Viewer.player.saveResume({ videoId, seconds });
    },

    async addGroup(name) {
      const { library } = get();
      const { nextLibrary, reason } = buildLibraryForAddGroup(library, name);
      if (reason === "invalid-name") {
        set({ lastMessage: "グループ名は1〜10文字で入力してください。" });
        return;
      }
      if (!nextLibrary) {
        return;
      }

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async addGroupWithVideo(name, videoId) {
      const { library } = get();
      const { nextLibrary, reason } = buildLibraryForAddGroupWithVideo(library, name, videoId);
      if (reason === "invalid-name" || !nextLibrary) {
        set({ lastMessage: "グループ名は1〜10文字で入力してください。" });
        return;
      }

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async addToGroup(groupId, videoId) {
      const { library } = get();
      const nextLibrary = buildLibraryForAddToGroup(library, groupId, videoId);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async removeGroup(groupId) {
      const { library } = get();
      const nextLibrary = buildLibraryForRemoveGroup(library, groupId);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async removeVideo(videoId) {
      const { library } = get();
      const nextLibrary = buildLibraryForRemoveVideo(library, videoId);

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },

    async clearAllVideos() {
      const { library } = get();
      const nextLibrary = buildLibraryForClearVideos(library);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary, lastMessage: "動画を全件削除しました。" });
    },

    async markPlaybackFailed(videoId, reason) {
      if (reason === "access-error") {
        await get().removeVideo(videoId);
        set({ busy: false, lastMessage: "アクセスエラーのため動画を除外しました。" });
        return;
      }

      if (reason === "not-playable") {
        set({ busy: false, lastMessage: "再生不可: フォーマット非対応または動画ではありません。" });
        return;
      }

      set({ busy: false, lastMessage: "再生時に不明なエラーが発生しました。" });
    },

    async renameVideo(videoId, label) {
      const { library } = get();
      const nextLibrary = buildLibraryForRenameVideo(library, videoId, label);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary });
    },
  };
}
