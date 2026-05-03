import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";

export function VideoTabs() {
  const tabs = useAppStore((state) => state.library.tabs);
  const videos = useAppStore((state) => state.library.videos);
  const closeVideoTab = useAppStore((state) => state.closeVideoTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const labelByVideoId = new Map(videos.map((video) => [video.id, video.label]));

  return (
    <div className="tabs-browser">
      {tabs.openVideoIds.map((videoId) => (
        <button
          key={videoId}
          className={`tab-chip ${videoId === tabs.activeVideoId ? "tab-chip-active" : ""}`}
          onClick={() => void setActiveTab(videoId)}
          title={videoId}
        >
          <Icon name="play" className="h-3.5 w-3.5" />
          <span className="max-w-44 truncate text-sm">{labelByVideoId.get(videoId) ?? videoId}</span>
          <span
            className="tab-chip-close"
            onClick={(event) => {
              event.stopPropagation();
              void closeVideoTab(videoId);
            }}
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </span>
        </button>
      ))}

      {tabs.openVideoIds.length === 0 && <span className="tabs-empty">タブなし</span>}
    </div>
  );
}
