import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";

type ValidationQueuePanelProps = {
  onClose: () => void;
};

export function ValidationQueuePanel({ onClose }: ValidationQueuePanelProps) {
  const queue = useAppStore((state) => state.validationQueue);

  return (
    <section className="queue-panel">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="bolt" className="h-4 w-4 text-teal-700" />
          <span className="panel-title text-slate-800">キュー</span>
        </div>
        <button className="icon-btn-sm" title="閉じる" onClick={onClose}>
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-teal-700 transition-all duration-300"
          style={{ width: queue.total > 0 ? `${(queue.done / queue.total) * 100}%` : "0%" }}
        />
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2 text-[11px]">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-teal-800">成功 {queue.success}</span>
        <span className="rounded-md bg-slate-200 px-2 py-1 text-slate-700">失敗 {queue.failed}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-teal-700">
          {queue.active ? "実行中" : "待機"}
        </span>
      </div>

      <div className="queue-list space-y-1 pr-1">
        {queue.items.map((item) => (
          <div key={item.key} className="queue-row">
            <span
              className={`status-dot ${
                item.status === "success"
                  ? "status-ok"
                  : item.status === "failed"
                    ? "status-failed"
                    : item.status === "running"
                      ? "status-running"
                      : "status-pending"
              }`}
            />
            <span className="truncate text-xs text-slate-700">{item.key}</span>
            <span className="text-[10px] tracking-wide text-slate-500">{item.message}</span>
          </div>
        ))}

        {queue.items.length === 0 && <p className="empty-text !text-slate-400">キューなし</p>}
      </div>
    </section>
  );
}
