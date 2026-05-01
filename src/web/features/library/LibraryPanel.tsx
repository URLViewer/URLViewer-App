import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";

const FLOATING_CLOSE_MS = 140;

export function LibraryPanel() {
  const [deleteTargetVideoId, setDeleteTargetVideoId] = useState<string | null>(null);
  const [deleteDialogClosing, setDeleteDialogClosing] = useState(false);
  const [isBulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videos = useAppStore((state) => state.library.videos);
  const groups = useAppStore((state) => state.library.groups);
  const tabs = useAppStore((state) => state.library.tabs);
  const playback = useAppStore((state) => state.playback);
  const openVideoTab = useAppStore((state) => state.openVideoTab);
  const removeVideo = useAppStore((state) => state.removeVideo);
  const clearAllVideos = useAppStore((state) => state.clearAllVideos);
  const renameVideo = useAppStore((state) => state.renameVideo);
  const requestPlaybackCommand = useAppStore((state) => state.requestPlaybackCommand);

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => a.label.localeCompare(b.label)),
    [videos],
  );
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

  return (
    <section className="panel-shell">
      <div className="mb-2 flex items-center justify-between">
        <span className="panel-title">ライブラリ</span>
        <div className="flex items-center gap-2">
          <span className="panel-count">{sortedVideos.length}</span>
          <button
            className="icon-btn-sm icon-btn-danger"
            title="全件削除"
            disabled={sortedVideos.length === 0}
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sortedVideos.map((video) => {
          const isActive = tabs.activeVideoId === video.id;
          const isPlaying = isActive && playback.videoId === video.id && playback.status === "playing";
          const playbackIcon = isPlaying ? "pause" : "play";
          const groupNames = groupNamesByVideoId.get(video.id) ?? [];

          return (
            <article
              key={video.id}
              className={`item-shell item-shell-video-simple ${isActive ? "item-shell-active-playing" : ""}`}
            >
              <input
                className="panel-input w-full"
                value={video.label}
                onChange={(event) => void renameVideo(video.id, event.target.value)}
              />

              <button
                className="icon-btn-sm"
                title={isPlaying ? "停止" : "再生"}
                onClick={() => void handlePlaybackButton(video.id)}
              >
                <Icon name={playbackIcon} className="h-4 w-4" />
              </button>

              <button
                className="icon-btn-sm icon-btn-danger"
                title="削除"
                onClick={() => openDeleteDialog(video.id)}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>

              <div className="video-group-footer">
                {groupNames.length > 0 ? (
                  <div className="video-group-badge-row">
                    {groupNames.map((name) => (
                      <span key={`${video.id}-${name}`} className="video-group-badge" title={name}>
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="video-group-empty">グループ未追加</span>
                )}
              </div>
            </article>
          );
        })}

        {sortedVideos.length === 0 && <p className="empty-text">動画なし</p>}
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

      {isBulkDeleteDialogOpen && (
        <div className="floating-overlay" onClick={() => setBulkDeleteDialogOpen(false)}>
          <div className="floating-dialog floating-enter" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-slate-800">動画を全件削除しますか？</p>
            <p className="mt-1 text-xs text-slate-500">
              対象: {sortedVideos.length}件
            </p>
            <div className="dialog-actions">
              <button
                className="dialog-btn dialog-btn-neutral"
                onClick={() => setBulkDeleteDialogOpen(false)}
              >
                キャンセル
              </button>
              <button
                className="dialog-btn dialog-btn-danger"
                onClick={() => {
                  setBulkDeleteDialogOpen(false);
                  void clearAllVideos();
                }}
              >
                全件削除
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
