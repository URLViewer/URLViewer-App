import { Icon } from "@web/components/Icon";
import type { VideoItem } from "@shared/types";
import { useEffect, useState } from "react";

type VideoListItemProps = {
  video: VideoItem;
  isActive: boolean;
  isPlaying: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  groupNames?: string[];
  showGroupMembership?: boolean;
  onSelect?: (videoId: string) => void;
  onPlayPause: (videoId: string) => void;
  onToggleLock: (videoId: string) => void;
  onDelete?: (videoId: string) => void;
  deleteDisabled?: boolean;
  onRename?: (videoId: string, label: string) => Promise<void> | void;
};

export function VideoListItem({
  video,
  isActive,
  isPlaying,
  selectionMode,
  isSelected,
  groupNames = [],
  showGroupMembership = true,
  onSelect,
  onPlayPause,
  onToggleLock,
  onDelete,
  deleteDisabled,
  onRename,
}: VideoListItemProps) {
  const [draftLabel, setDraftLabel] = useState(video.label);

  useEffect(() => {
    setDraftLabel(video.label);
  }, [video.id, video.label]);

  const commitLabelEdit = async () => {
    if (!onRename) {
      return;
    }
    const nextLabel = draftLabel.trim();
    if (nextLabel.length > 0 && nextLabel !== video.label) {
      await onRename(video.id, nextLabel);
      return;
    }
    if (nextLabel.length === 0) {
      setDraftLabel(video.label);
    }
  };
  const resolvedDeleteDisabled = deleteDisabled ?? video.locked;

  return (
    <article
      className={`item-shell item-shell-video ${isActive ? "item-shell-active-playing" : ""} ${
        isSelected ? "item-shell-selected" : ""
      } ${video.locked ? "item-shell-locked" : ""}`}
      onClick={() => {
        if (!selectionMode || !onSelect) {
          return;
        }
        onSelect(video.id);
      }}
    >
      <div className="library-item-leading">
        {selectionMode ? (
          <button
            className={`library-select-dot ${isSelected ? "library-select-dot-on" : ""}`}
            title={isSelected ? "選択解除" : "選択"}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(video.id);
            }}
          >
            {isSelected && <Icon name="check" className="h-3 w-3" />}
          </button>
        ) : (
          <span className={`status-dot ${isPlaying ? "status-running" : "status-pending"}`} />
        )}
      </div>

      <div className="video-item-main">
        <input
          className="panel-input w-full"
          value={draftLabel}
          disabled={selectionMode}
          onChange={(event) => setDraftLabel(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onBlur={() => void commitLabelEdit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              return;
            }
            if (event.key === "Escape") {
              setDraftLabel(video.label);
              event.currentTarget.blur();
            }
          }}
        />
      </div>

      <div className="video-item-actions">
        <button
          className="icon-btn-sm video-action-btn"
          title={isPlaying ? "停止" : "再生"}
          onClick={(event) => {
            event.stopPropagation();
            onPlayPause(video.id);
          }}
        >
          <Icon name={isPlaying ? "pause" : "play"} className="h-3.5 w-3.5" />
        </button>

        <button
          className="icon-btn-sm video-action-btn"
          title={video.locked ? "ロック解除" : "ロック"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleLock(video.id);
          }}
          disabled={selectionMode}
        >
          <Icon name={video.locked ? "lock" : "unlock"} className="h-3.5 w-3.5" />
        </button>

        {!selectionMode && onDelete && (
          <button
            className="icon-btn-sm icon-btn-danger video-action-btn"
            title="削除"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(video.id);
            }}
            disabled={resolvedDeleteDisabled}
          >
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="video-group-footer">
        <div className="flex items-center gap-2">
          {video.locked && <span className="video-group-badge">ロック中</span>}
          {!Number.isFinite(video.durationSeconds) && <span className="video-group-badge">長さ取得中</span>}
          {typeof video.durationSeconds === "number" && (
            <span className="video-group-badge">{Math.floor(video.durationSeconds)}秒</span>
          )}
        </div>
        {showGroupMembership &&
          (groupNames.length > 0 ? (
            <div className="video-group-badge-row">
              {groupNames.map((name) => (
                <span key={`${video.id}-${name}`} className="video-group-badge" title={name}>
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <span className="video-group-empty">グループ未追加</span>
          ))}
      </div>
    </article>
  );
}
