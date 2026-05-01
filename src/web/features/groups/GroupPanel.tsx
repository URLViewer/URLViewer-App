import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";

const GROUP_NAME_MAX = 10;
const FLOATING_CLOSE_MS = 140;

export function GroupPanel() {
  const [groupName, setGroupName] = useState("");
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [deleteTargetGroupId, setDeleteTargetGroupId] = useState<string | null>(null);
  const [deleteDialogClosing, setDeleteDialogClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = useAppStore((state) => state.library.groups);
  const videos = useAppStore((state) => state.library.videos);
  const addGroup = useAppStore((state) => state.addGroup);
  const removeGroup = useAppStore((state) => state.removeGroup);
  const openVideoTab = useAppStore((state) => state.openVideoTab);

  const videoMap = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos]);
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );
  const deleteTargetGroup = sortedGroups.find((group) => group.id === deleteTargetGroupId) ?? null;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openDeleteDialog = (groupId: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDeleteDialogClosing(false);
    setDeleteTargetGroupId(groupId);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setDeleteDialogClosing(false);
      setDeleteTargetGroupId(null);
      closeTimerRef.current = null;
    }, FLOATING_CLOSE_MS);
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
      </div>

      <div className="space-y-2">
        {sortedGroups.map((group) => {
          const expanded = Boolean(openGroupIds[group.id]);
          const groupVideos = group.videoIds
            .map((videoId) => videoMap.get(videoId))
            .filter((video): video is NonNullable<typeof video> => Boolean(video));

          return (
            <article key={group.id} className="group-card">
              <div className="group-card-head">
                <button
                  className="group-toggle-btn"
                  title={expanded ? "閉じる" : "開く"}
                  onClick={() => toggleGroupOpen(group.id)}
                >
                  <Icon
                    name="chevron-down"
                    className={`h-4 w-4 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                <span className="group-card-title" title={group.name}>
                  {group.name}
                </span>
                <span className="panel-count">{group.videoIds.length}</span>
                <button
                  className="icon-btn-sm icon-btn-danger"
                  title="グループ削除"
                  onClick={() => openDeleteDialog(group.id)}
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>

              {expanded && (
                <div className="group-card-body">
                  {groupVideos.length > 0 ? (
                    <div className="space-y-1">
                      {groupVideos.map((video) => (
                        <button
                          key={`${group.id}-${video.id}`}
                          className="group-entry"
                          onClick={() => void openVideoTab(video.id)}
                          title={video.id}
                        >
                          <Icon name="play" className="h-3.5 w-3.5" />
                          <span className="truncate">{video.label}</span>
                        </button>
                      ))}
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
            className={`floating-dialog ${deleteDialogClosing ? "floating-exit" : "floating-enter"}`}
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
    </section>
  );
}
