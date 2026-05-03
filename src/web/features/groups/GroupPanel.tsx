import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@web/components/Icon";
import { VideoListItem } from "@web/features/library/VideoListItem";
import { useAppStore } from "@web/store/appStore";

const GROUP_NAME_MAX = 10;
const FLOATING_CLOSE_MS = 140;
const NAME_COLLATOR = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

export function GroupPanel() {
  const [groupName, setGroupName] = useState("");
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [deleteTargetGroupId, setDeleteTargetGroupId] = useState<string | null>(null);
  const [deleteGroupDialogClosing, setDeleteGroupDialogClosing] = useState(false);
  const [deleteTargetGroupVideo, setDeleteTargetGroupVideo] = useState<{
    groupId: string;
    videoId: string;
  } | null>(null);
  const [deleteVideoDialogClosing, setDeleteVideoDialogClosing] = useState(false);
  const [isSelectionDeleteDialogOpen, setSelectionDeleteDialogOpen] = useState(false);
  const groupCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = useAppStore((state) => state.library.groups);
  const videos = useAppStore((state) => state.library.videos);
  const tabs = useAppStore((state) => state.library.tabs);
  const playback = useAppStore((state) => state.playback);
  const groupSelectionMode = useAppStore((state) => state.groupSelectionMode);
  const selectedGroupIds = useAppStore((state) => state.selectedGroupIds);

  const addGroup = useAppStore((state) => state.addGroup);
  const removeGroup = useAppStore((state) => state.removeGroup);
  const removeVideoFromGroup = useAppStore((state) => state.removeVideoFromGroup);
  const renameVideo = useAppStore((state) => state.renameVideo);
  const toggleVideoLock = useAppStore((state) => state.toggleVideoLock);
  const openVideoTab = useAppStore((state) => state.openVideoTab);
  const requestPlaybackCommand = useAppStore((state) => state.requestPlaybackCommand);
  const setGroupSelectionMode = useAppStore((state) => state.setGroupSelectionMode);
  const toggleGroupSelection = useAppStore((state) => state.toggleGroupSelection);
  const selectAllGroups = useAppStore((state) => state.selectAllGroups);
  const clearSelectedGroups = useAppStore((state) => state.clearSelectedGroups);
  const removeSelectedGroups = useAppStore((state) => state.removeSelectedGroups);
  const lockSelectedGroups = useAppStore((state) => state.lockSelectedGroups);
  const toggleGroupLock = useAppStore((state) => state.toggleGroupLock);

  const videoMap = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos]);
  const sortedGroups = useMemo(
    () =>
      [...groups].sort((a, b) => {
        const aFav = a.builtin === "favorites";
        const bFav = b.builtin === "favorites";
        if (aFav !== bFav) {
          return aFav ? -1 : 1;
        }
        return NAME_COLLATOR.compare(a.name, b.name);
      }),
    [groups],
  );
  const deleteTargetGroup = sortedGroups.find((group) => group.id === deleteTargetGroupId) ?? null;
  const selectedSet = useMemo(() => new Set(selectedGroupIds), [selectedGroupIds]);

  useEffect(() => {
    return () => {
      if (groupCloseTimerRef.current) {
        clearTimeout(groupCloseTimerRef.current);
      }
      if (videoCloseTimerRef.current) {
        clearTimeout(videoCloseTimerRef.current);
      }
    };
  }, []);

  const openDeleteDialog = (groupId: string) => {
    if (groupCloseTimerRef.current) {
      clearTimeout(groupCloseTimerRef.current);
      groupCloseTimerRef.current = null;
    }
    setDeleteGroupDialogClosing(false);
    setDeleteTargetGroupId(groupId);
  };

  const closeDeleteDialog = () => {
    setDeleteGroupDialogClosing(true);
    groupCloseTimerRef.current = setTimeout(() => {
      setDeleteGroupDialogClosing(false);
      setDeleteTargetGroupId(null);
      groupCloseTimerRef.current = null;
    }, FLOATING_CLOSE_MS);
  };

  const openDeleteVideoDialog = (groupId: string, videoId: string) => {
    if (videoCloseTimerRef.current) {
      clearTimeout(videoCloseTimerRef.current);
      videoCloseTimerRef.current = null;
    }
    setDeleteVideoDialogClosing(false);
    setDeleteTargetGroupVideo({ groupId, videoId });
  };

  const closeDeleteVideoDialog = () => {
    setDeleteVideoDialogClosing(true);
    videoCloseTimerRef.current = setTimeout(() => {
      setDeleteVideoDialogClosing(false);
      setDeleteTargetGroupVideo(null);
      videoCloseTimerRef.current = null;
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

  const toggleGroupOpen = (groupId: string) => {
    setOpenGroupIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <section className="panel-shell">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="panel-input flex-1"
          value={groupName}
          maxLength={GROUP_NAME_MAX}
          placeholder="グループ名 (1〜10文字)"
          onChange={(event) => setGroupName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void addGroup(groupName);
              setGroupName("");
            }
          }}
        />
        <button
          className="icon-btn-sm"
          title="グループ作成"
          onClick={() => {
            void addGroup(groupName);
            setGroupName("");
          }}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
        <button
          className={`panel-text-btn ${groupSelectionMode ? "panel-text-btn-active" : ""}`}
          title="選択"
          onClick={() => setGroupSelectionMode(!groupSelectionMode)}
        >
          選択
        </button>
      </div>

      {groupSelectionMode && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button className="plugin-action-btn" onClick={selectAllGroups}>全て選択</button>
          <button className="plugin-action-btn" onClick={clearSelectedGroups}>選択クリア</button>
          <button
            className="plugin-action-btn plugin-action-btn-danger"
            onClick={() => setSelectionDeleteDialogOpen(true)}
            disabled={selectedGroupIds.length === 0}
          >
            削除
          </button>
          <button className="plugin-action-btn" onClick={() => void lockSelectedGroups()} disabled={selectedGroupIds.length === 0}>
            <Icon name="lock" className="mr-1 h-3.5 w-3.5" />ロック
          </button>
        </div>
      )}

      <div className="space-y-2">
        {sortedGroups.map((group) => {
          const expanded = Boolean(openGroupIds[group.id]);
          const groupVideos = group.videoIds
            .map((videoId) => videoMap.get(videoId))
            .filter((video): video is NonNullable<typeof video> => Boolean(video));
          const isSelected = selectedSet.has(group.id);
          const isFavorites = group.builtin === "favorites";

          return (
            <article
              key={group.id}
              className={`group-card ${isSelected ? "item-shell-selected" : ""} ${group.locked ? "item-shell-locked" : ""}`}
              onClick={() => {
                if (!groupSelectionMode) {
                  return;
                }
                toggleGroupSelection(group.id);
              }}
            >
              <div className="group-card-head">
                <button
                  className="group-toggle-btn"
                  title={expanded ? "閉じる" : "開く"}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGroupOpen(group.id);
                  }}
                >
                  <Icon
                    name="chevron-down"
                    className={`h-4 w-4 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                <span className="group-card-title" title={group.name}>
                  {isFavorites && <Icon name="star-solid" className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                  <span className="truncate">{group.name}</span>
                </span>
                <span className="panel-count">{group.videoIds.length}</span>
                {!groupSelectionMode && (
                  <button
                    className="icon-btn-sm"
                    title={isFavorites ? "お気に入りはロック固定です" : group.locked ? "ロック解除" : "ロック"}
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleGroupLock(group.id);
                    }}
                    disabled={isFavorites}
                  >
                    <Icon name={group.locked ? "lock" : "unlock"} className="h-4 w-4" />
                  </button>
                )}
                {!groupSelectionMode && (
                  <button
                    className="icon-btn-sm icon-btn-danger"
                    title="グループ削除"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeleteDialog(group.id);
                    }}
                    disabled={group.locked || isFavorites}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                )}
              </div>

              {expanded && (
                <div className="group-card-body">
                  {groupVideos.length > 0 ? (
                    <div className="space-y-1">
                      {groupVideos.map((video) => {
                        const isActive = tabs.activeVideoId === video.id;
                        const isPlaying =
                          isActive && playback.videoId === video.id && playback.status === "playing";
                        return (
                          <div
                            key={`${group.id}-${video.id}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <VideoListItem
                              video={video}
                              isActive={isActive}
                              isPlaying={isPlaying}
                              selectionMode={false}
                              isSelected={false}
                              showGroupMembership={false}
                              onPlayPause={(videoId) => void handlePlaybackButton(videoId)}
                              onToggleLock={(videoId) => void toggleVideoLock(videoId)}
                              onDelete={(videoId) => openDeleteVideoDialog(group.id, videoId)}
                              deleteDisabled={false}
                              onRename={(videoId, label) => renameVideo(videoId, label)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="group-card-empty">動画なし</div>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {sortedGroups.length === 0 && <p className="empty-text">グループなし</p>}
      </div>

      {deleteTargetGroup && (
        <div className="floating-overlay" onClick={closeDeleteDialog}>
          <div
            className={`floating-dialog ${deleteGroupDialogClosing ? "floating-exit" : "floating-enter"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium text-slate-800">このグループを削除しますか？</p>
            <p className="mt-1 text-xs text-slate-500">{deleteTargetGroup.name}</p>
            <div className="dialog-actions">
              <button className="dialog-btn dialog-btn-neutral" onClick={closeDeleteDialog}>
                キャンセル
              </button>
              <button
                className="dialog-btn dialog-btn-danger"
                onClick={() => {
                  void removeGroup(deleteTargetGroup.id);
                  closeDeleteDialog();
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetGroupVideo && (
        <div className="floating-overlay" onClick={closeDeleteVideoDialog}>
          <div
            className={`floating-dialog ${deleteVideoDialogClosing ? "floating-exit" : "floating-enter"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-medium text-slate-800">この動画をグループから外しますか？</p>
            <p className="mt-1 text-xs text-slate-500">
              {videos.find((video) => video.id === deleteTargetGroupVideo.videoId)?.label ??
                deleteTargetGroupVideo.videoId}
            </p>
            <div className="dialog-actions">
              <button className="dialog-btn dialog-btn-neutral" onClick={closeDeleteVideoDialog}>
                キャンセル
              </button>
              <button
                className="dialog-btn dialog-btn-danger"
                onClick={() => {
                  void removeVideoFromGroup(
                    deleteTargetGroupVideo.groupId,
                    deleteTargetGroupVideo.videoId,
                  );
                  closeDeleteVideoDialog();
                }}
              >
                外す
              </button>
            </div>
          </div>
        </div>
      )}

      {isSelectionDeleteDialogOpen && (
        <div className="floating-overlay" onClick={() => setSelectionDeleteDialogOpen(false)}>
          <div className="floating-dialog floating-enter" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-slate-800">選択中のグループを削除しますか？</p>
            <p className="mt-1 text-xs text-slate-500">対象: {selectedGroupIds.length}件</p>
            <div className="dialog-actions">
              <button className="dialog-btn dialog-btn-neutral" onClick={() => setSelectionDeleteDialogOpen(false)}>
                キャンセル
              </button>
              <button
                className="dialog-btn dialog-btn-danger"
                onClick={() => {
                  setSelectionDeleteDialogOpen(false);
                  void removeSelectedGroups();
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
