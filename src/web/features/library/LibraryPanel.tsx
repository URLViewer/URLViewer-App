import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";

const FLOATING_CLOSE_MS = 140;

export function LibraryPanel() {
  const [deleteTargetVideoId, setDeleteTargetVideoId] = useState<string | null>(null);
  const [deleteDialogClosing, setDeleteDialogClosing] = useState(false);
  const [isBulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
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

  const commitLabelEdit = async (videoId: string) => {
    const draft = draftLabels[videoId];
    if (draft === undefined) {
      return;
    }

    const target = videos.find((video) => video.id === videoId);
    if (!target) {
      return;
    }

    try {
      const nextLabel = draft.trim();
      if (nextLabel.length > 0 && nextLabel !== target.label) {
        await renameVideo(videoId, nextLabel);
      }
    } finally {
      setDraftLabels((current) => {
        if (!(videoId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[videoId];
        return next;
      });
    }
  };

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
          <span className="panel-count">{videos.length}</span>
          <button
            className="icon-btn-sm icon-btn-danger"
            title="全件削除"
            disabled={videos.length === 0}
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {videos.map((video) => {
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
                value={draftLabels[video.id] ?? video.label}
                onChange={(event) => {
                  const { value } = event.target;
                  setDraftLabels((current) => ({
                    ...current,
                    [video.id]: value,
                  }));
                }}
                onBlur={() => void commitLabelEdit(video.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                    return;
                  }
                  if (event.key === "Escape") {
                    setDraftLabels((current) => {
                      if (!(video.id in current)) {
                        return current;
                      }
                      const next = { ...current };
                      delete next[video.id];
                      return next;
                    });
                    event.currentTarget.blur();
                  }
                }}
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

      {isBulkDeleteDialogOpen && (
        <div className="floating-overlay" onClick={() => setBulkDeleteDialogOpen(false)}>
          <div className="floating-dialog floating-enter" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-slate-800">動画を全件削除しますか？</p>
            <p className="mt-1 text-xs text-slate-500">
              対象: {videos.length}件
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
