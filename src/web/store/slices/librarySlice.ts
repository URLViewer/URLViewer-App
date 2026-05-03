import {
  buildLibraryForAddGroup,
  buildLibraryForAddGroupWithVideo,
  buildLibraryForAddToFavorites,
  buildLibraryForAddToGroup,
  buildLibraryForRemoveVideoFromGroup,
  buildLibraryForCloseTab,
  buildLibraryForOpenTab,
  buildLibraryForRemoveGroup,
  buildLibraryForRemoveGroups,
  buildLibraryForRemoveVideo,
  buildLibraryForRemoveVideos,
  buildLibraryForRenameVideo,
  buildLibraryForSetActiveTab,
  buildLibraryForClearVideos,
  buildLibraryForLockVideos,
  buildLibraryForToggleVideoLock,
  buildLibraryForLockGroups,
  buildLibraryForToggleGroupLock,
  buildLibraryForSetDuration,
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
  | "removeVideoFromGroup"
  | "removeGroup"
  | "removeVideo"
  | "clearAllVideos"
  | "markPlaybackFailed"
  | "renameVideo"
  | "addGroupWithVideo"
  | "addActiveVideoToFavorites"
  | "setVideoDuration"
  | "removeSelectedVideos"
  | "lockSelectedVideos"
  | "toggleVideoLock"
  | "removeSelectedGroups"
  | "lockSelectedGroups"
  | "toggleGroupLock"
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
      const { library, appendLog } = get();
      const { nextLibrary, reason } = buildLibraryForAddGroup(library, name);
      if (reason === "invalid-name") {
        const message = "グループ名は1〜10文字で入力してください。";
        set({ lastMessage: message });
        appendLog({ level: "error", scope: "groups", message });
        return;
      }
      if (!nextLibrary) {
        if (reason === "duplicate") {
          const message = "同名グループが存在します。";
          set({ lastMessage: message });
          appendLog({ level: "error", scope: "groups", message });
        }
        return;
      }

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary, lastMessage: "グループを作成しました。" });
      appendLog({ level: "success", scope: "groups", message: "グループを作成しました。" });
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

    async removeVideoFromGroup(groupId, videoId) {
      const { library } = get();
      const nextLibrary = buildLibraryForRemoveVideoFromGroup(library, groupId, videoId);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary, lastMessage: "グループから動画を外しました。" });
    },

    async addActiveVideoToFavorites() {
      const { library, appendLog } = get();
      const videoId = library.tabs.activeVideoId;
      if (!videoId) {
        set({ lastMessage: "再生中の動画がありません。" });
        return;
      }

      const nextLibrary = buildLibraryForAddToFavorites(library, videoId);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary, lastMessage: "お気に入りに追加しました。" });
      appendLog({ level: "success", scope: "favorites", message: "再生中動画をお気に入りへ追加しました。" });
    },

    async removeGroup(groupId) {
      const { library, appendLog } = get();
      const before = library.groups.length;
      const nextLibrary = buildLibraryForRemoveGroup(library, groupId);
      if (nextLibrary.groups.length === before) {
        set({ lastMessage: "ロック中または固定グループのため削除できません。" });
        appendLog({ level: "error", scope: "groups", message: "ロック済みグループ削除を拒否しました。" });
        return;
      }

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary, lastMessage: "グループを削除しました。" });
      appendLog({ level: "success", scope: "groups", message: "グループを削除しました。" });
    },

    async removeVideo(videoId) {
      const { library, appendLog } = get();
      const before = library.videos.length;
      const nextLibrary = buildLibraryForRemoveVideo(library, videoId);
      if (nextLibrary.videos.length === before) {
        set({ lastMessage: "ロック中の動画は削除できません。" });
        appendLog({ level: "error", scope: "library", message: "ロック済み動画削除を拒否しました。" });
        return;
      }

      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary, lastMessage: "動画を削除しました。" });
      appendLog({ level: "success", scope: "library", message: "動画を削除しました。" });
    },

    async removeSelectedVideos() {
      const { library, selectedVideoIds, appendLog } = get();
      if (selectedVideoIds.length === 0) {
        set({ lastMessage: "動画が選択されていません。" });
        return;
      }

      const nextLibrary = buildLibraryForRemoveVideos(library, selectedVideoIds);
      const removedCount = library.videos.length - nextLibrary.videos.length;
      await window.m3u8Viewer.library.save(nextLibrary);
      set({
        library: nextLibrary,
        selectedVideoIds: [],
        librarySelectionMode: false,
        lastMessage: `動画を削除しました（${removedCount}件）。`,
      });
      appendLog({ level: "success", scope: "library", message: `選択動画を削除しました（${removedCount}件）。` });
    },

    async lockSelectedVideos() {
      const { library, selectedVideoIds, appendLog } = get();
      if (selectedVideoIds.length === 0) {
        set({ lastMessage: "動画が選択されていません。" });
        return;
      }

      const nextLibrary = buildLibraryForLockVideos(library, selectedVideoIds);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({
        library: nextLibrary,
        selectedVideoIds: [],
        librarySelectionMode: false,
        lastMessage: `動画をロックしました（${selectedVideoIds.length}件）。`,
      });
      appendLog({ level: "success", scope: "library", message: `選択動画をロックしました（${selectedVideoIds.length}件）。` });
    },

    async toggleVideoLock(videoId) {
      const { library, appendLog } = get();
      const target = library.videos.find((video) => video.id === videoId);
      if (!target) {
        return;
      }

      const nextLibrary = buildLibraryForToggleVideoLock(library, videoId);
      await window.m3u8Viewer.library.save(nextLibrary);
      const nextLocked = !target.locked;
      set({
        library: nextLibrary,
        lastMessage: nextLocked ? "動画をロックしました。" : "動画ロックを解除しました。",
      });
      appendLog({
        level: "success",
        scope: "library",
        message: nextLocked ? "動画をロックしました。" : "動画ロックを解除しました。",
      });
    },

    async removeSelectedGroups() {
      const { library, selectedGroupIds, appendLog } = get();
      if (selectedGroupIds.length === 0) {
        set({ lastMessage: "グループが選択されていません。" });
        return;
      }

      const nextLibrary = buildLibraryForRemoveGroups(library, selectedGroupIds);
      const removedCount = library.groups.length - nextLibrary.groups.length;
      await window.m3u8Viewer.library.save(nextLibrary);
      set({
        library: nextLibrary,
        selectedGroupIds: [],
        groupSelectionMode: false,
        lastMessage: `グループを削除しました（${removedCount}件）。`,
      });
      appendLog({ level: "success", scope: "groups", message: `選択グループを削除しました（${removedCount}件）。` });
    },

    async lockSelectedGroups() {
      const { library, selectedGroupIds, appendLog } = get();
      if (selectedGroupIds.length === 0) {
        set({ lastMessage: "グループが選択されていません。" });
        return;
      }

      const nextLibrary = buildLibraryForLockGroups(library, selectedGroupIds);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({
        library: nextLibrary,
        selectedGroupIds: [],
        groupSelectionMode: false,
        lastMessage: `グループをロックしました（${selectedGroupIds.length}件）。`,
      });
      appendLog({ level: "success", scope: "groups", message: `選択グループをロックしました（${selectedGroupIds.length}件）。` });
    },

    async toggleGroupLock(groupId) {
      const { library, appendLog } = get();
      const target = library.groups.find((group) => group.id === groupId);
      if (!target || target.builtin === "favorites") {
        return;
      }

      const nextLibrary = buildLibraryForToggleGroupLock(library, groupId);
      await window.m3u8Viewer.library.save(nextLibrary);
      const nextLocked = !target.locked;
      set({
        library: nextLibrary,
        lastMessage: nextLocked ? "グループをロックしました。" : "グループロックを解除しました。",
      });
      appendLog({
        level: "success",
        scope: "groups",
        message: nextLocked ? "グループをロックしました。" : "グループロックを解除しました。",
      });
    },

    async clearAllVideos() {
      const { library, appendLog } = get();
      const nextLibrary = buildLibraryForClearVideos(library);
      await window.m3u8Viewer.library.save(nextLibrary);
      set({ library: nextLibrary, lastMessage: "動画を削除しました。" });
      appendLog({ level: "success", scope: "library", message: "動画を一括削除しました。" });
    },

    async markPlaybackFailed(videoId, reason, detail) {
      const { appendLog } = get();
      if (reason === "access-error") {
        await get().removeVideo(videoId);
        set({ busy: false, lastMessage: "アクセスエラーのため動画を除外しました。" });
        appendLog({
          level: "error",
          scope: "player",
          message: "アクセスエラーのため動画を除外しました。",
          detail,
        });
        return;
      }

      if (reason === "not-playable") {
        set({ busy: false, lastMessage: "再生不可: フォーマット非対応または動画ではありません。" });
        appendLog({
          level: "error",
          scope: "player",
          message: "再生不可エラーが発生しました。",
          detail,
        });
        return;
      }

      set({ busy: false, lastMessage: "再生時に不明なエラーが発生しました。" });
      appendLog({
        level: "error",
        scope: "player",
        message: "再生時に不明なエラーが発生しました。",
        detail,
      });
    },

    async renameVideo(videoId, label) {
      const { library } = get();
      const nextLibrary = buildLibraryForRenameVideo(library, videoId, label);
      set({ library: nextLibrary });
      await window.m3u8Viewer.library.save(nextLibrary);
    },

    async setVideoDuration(videoId, durationSeconds) {
      const { library } = get();
      const nextLibrary = buildLibraryForSetDuration(library, videoId, durationSeconds);
      if (nextLibrary === library) {
        return;
      }
      set({ library: nextLibrary });
      await window.m3u8Viewer.library.save(nextLibrary);
    },
  };
}
