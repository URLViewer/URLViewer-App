import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@web/components/Icon";
import { sortVideos } from "@web/features/library/sortVideos";
import { VideoListItem } from "@web/features/library/VideoListItem";
import { useAppStore } from "@web/store/appStore";

const FLOATING_CLOSE_MS = 140;

export function LibraryPanel() {
  const [deleteTargetVideoId, setDeleteTargetVideoId] = useState<string | null>(null);
  const [deleteDialogClosing, setDeleteDialogClosing] = useState(false);
  const [isSelectionDeleteDialogOpen, setSelectionDeleteDialogOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videos = useAppStore((state) => state.library.videos);
  const groups = useAppStore((state) => state.library.groups);
  const tabs = useAppStore((state) => state.library.tabs);
  const playback = useAppStore((state) => state.playback);
  const librarySortKey = useAppStore((state) => state.librarySortKey);
  const librarySortOrder = useAppStore((state) => state.librarySortOrder);
  const librarySelectionMode = useAppStore((state) => state.librarySelectionMode);
  const selectedVideoIds = useAppStore((state) => state.selectedVideoIds);

  const openVideoTab = useAppStore((state) => state.openVideoTab);
  const removeVideo = useAppStore((state) => state.removeVideo);
  const renameVideo = useAppStore((state) => state.renameVideo);
  const requestPlaybackCommand = useAppStore((state) => state.requestPlaybackCommand);
  const setLibrarySort = useAppStore((state) => state.setLibrarySort);
  const toggleLibrarySortOrder = useAppStore((state) => state.toggleLibrarySortOrder);
  const setLibrarySelectionMode = useAppStore((state) => state.setLibrarySelectionMode);
  const toggleVideoSelection = useAppStore((state) => state.toggleVideoSelection);
  const selectAllVideos = useAppStore((state) => state.selectAllVideos);
  const clearSelectedVideos = useAppStore((state) => state.clearSelectedVideos);
  const removeSelectedVideos = useAppStore((state) => state.removeSelectedVideos);
  const lockSelectedVideos = useAppStore((state) => state.lockSelectedVideos);
  const toggleVideoLock = useAppStore((state) => state.toggleVideoLock);

  const groupNamesByVideoId = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const group of groups) {
      for (const videoId of group.videoIds) {
        const current = map.get(videoId) ?? [];
        current.push(group.name);
        map.set(videoId, current);
      }
    }

    return map;
  }, [groups]);

  const sortedVideos = useMemo(() => {
    return sortVideos(videos, librarySortKey, librarySortOrder);
  }, [librarySortKey, librarySortOrder, videos]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openDeleteDialog = (videoId: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDeleteDialogClosing(false);
    setDeleteTargetVideoId(videoId);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setDeleteDialogClosing(false);
      setDeleteTargetVideoId(null);
      closeTimerRef.current = null;
    }, FLOATING_CLOSE_MS);
  };

  const handlePlaybackButton = async (videoId: string) => {
    const isActive = tabs.activeVideoId === videoId;
    const isPlaying = isActive && playback.videoId === videoId && playback.status === "playing";

    if (!isActive) {
      await openVideoTab(videoId);
      requestPlaybackCommand(videoId, "play");
      return;
    }

    requestPlaybackCommand(videoId, isPlaying ? "pause" : "play");
  };

  const selectedSet = useMemo(() => new Set(selectedVideoIds), [selectedVideoIds]);

  return (
    <section className="panel-shell">
      <div className="mb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="panel-title whitespace-nowrap">ライブラリ</span>
            <span className="panel-count">{videos.length}</span>
          </div>
          <button
            className={`panel-text-btn ${librarySelectionMode ? "panel-text-btn-active" : ""}`}
            title="選択"
            onClick={() => setLibrarySelectionMode(!librarySelectionMode)}
          >
            選択
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="library-sort-shell" role="group" aria-label="並び替えキー">
            <button
              className={`library-sort-chip ${librarySortKey === "added" ? "library-sort-chip-active" : ""}`}
              title="追加順で並び替え"
              onClick={() => setLibrarySort("added")}
            >
              追加順
            </button>
            <button
              className={`library-sort-chip ${librarySortKey === "name" ? "library-sort-chip-active" : ""}`}
              title="動画名で並び替え"
              onClick={() => setLibrarySort("name")}
            >
              名前
            </button>
            <button
              className={`library-sort-chip ${librarySortKey === "duration" ? "library-sort-chip-active" : ""}`}
              title="動画長さで並び替え"
              onClick={() => setLibrarySort("duration")}
            >
              長さ
            </button>
          </div>
          <button className="library-sort-order-btn" title="昇順/降順" onClick={toggleLibrarySortOrder}>
            <Icon name={librarySortOrder === "asc" ? "arrow-up" : "arrow-down"} className="h-4 w-4" />
          </button>
        </div>
      </div>

      {librarySelectionMode && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button className="plugin-action-btn" onClick={selectAllVideos}>全て選択</button>
          <button className="plugin-action-btn" onClick={clearSelectedVideos}>選択クリア</button>
          <button
            className="plugin-action-btn plugin-action-btn-danger"
            onClick={() => setSelectionDeleteDialogOpen(true)}
            disabled={selectedVideoIds.length === 0}
          >
            削除
          </button>
          <button className="plugin-action-btn" onClick={() => void lockSelectedVideos()} disabled={selectedVideoIds.length === 0}>
            <Icon name="lock" className="mr-1 h-3.5 w-3.5" />ロック
          </button>
        </div>
      )}

      <div className="space-y-2">
        {sortedVideos.map((video) => {
          const isActive = tabs.activeVideoId === video.id;
          const isPlaying = isActive && playback.videoId === video.id && playback.status === "playing";
          const groupNames = groupNamesByVideoId.get(video.id) ?? [];
          const isSelected = selectedSet.has(video.id);

          return (
            <VideoListItem
              key={video.id}
              video={video}
              isActive={isActive}
              isPlaying={isPlaying}
              selectionMode={librarySelectionMode}
              isSelected={isSelected}
              groupNames={groupNames}
              onSelect={toggleVideoSelection}
              onPlayPause={(videoId) => void handlePlaybackButton(videoId)}
              onToggleLock={(videoId) => void toggleVideoLock(videoId)}
              onDelete={openDeleteDialog}
              onRename={(videoId, label) => renameVideo(videoId, label)}
            />
          );
        })}

        {videos.length === 0 && <p className="empty-text">動画なし</p>}
      </div>

      {deleteTargetVideoId && (
        <div className="floating-overlay" onClick={closeDeleteDialog}>
          <div
            className={`floating-dialog ${deleteDialogClosing ? "floating-exit" : "floating-enter"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium text-slate-800">この動画を削除しますか？</p>
            <p className="mt-1 text-xs text-slate-500">
              {videos.find((video) => video.id === deleteTargetVideoId)?.label ?? deleteTargetVideoId}
            </p>
            <div className="dialog-actions">
              <button className="dialog-btn dialog-btn-neutral" onClick={closeDeleteDialog}>
                キャンセル
              </button>
              <button
                className="dialog-btn dialog-btn-danger"
                onClick={() => {
                  void removeVideo(deleteTargetVideoId);
                  closeDeleteDialog();
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {isSelectionDeleteDialogOpen && (
        <div className="floating-overlay" onClick={() => setSelectionDeleteDialogOpen(false)}>
          <div className="floating-dialog floating-enter" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-slate-800">選択中の動画を削除しますか？</p>
            <p className="mt-1 text-xs text-slate-500">対象: {selectedVideoIds.length}件</p>
            <div className="dialog-actions">
              <button className="dialog-btn dialog-btn-neutral" onClick={() => setSelectionDeleteDialogOpen(false)}>
                キャンセル
              </button>
              <button
                className="dialog-btn dialog-btn-danger"
                onClick={() => {
                  setSelectionDeleteDialogOpen(false);
                  void removeSelectedVideos();
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
