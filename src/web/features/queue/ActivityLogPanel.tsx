import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";

type ActivityLogPanelProps = {
  onClose: () => void;
};

function formatLogTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function ActivityLogPanel({ onClose }: ActivityLogPanelProps) {
  const activityLogs = useAppStore((state) => state.activityLogs);
  const clearLogs = useAppStore((state) => state.clearLogs);

  return (
    <section className="queue-panel">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="log" className="h-4 w-4 text-teal-700" />
          <span className="panel-title text-slate-800">イベントログ</span>
        </div>
        <button className="icon-btn-sm" title="閉じる" onClick={onClose}>
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
        <span className="text-xs text-slate-500">全体イベントの履歴</span>
        <button className="icon-btn-sm" title="ログをクリア" onClick={clearLogs}>
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>

      <div className="queue-log-list space-y-1 pr-1">
        {activityLogs.map((log) => (
          <div key={log.id} className={`queue-log-row queue-log-${log.level}`}>
            <div className="queue-log-head">
              <span className="queue-log-time">{formatLogTime(log.at)}</span>
              <span className="queue-log-scope">{log.scope}</span>
            </div>
            <div className="queue-log-message">{log.message}</div>
            {log.detail && <div className="queue-log-detail">{log.detail}</div>}
          </div>
        ))}

        {activityLogs.length === 0 && <p className="empty-text !py-3 !text-slate-400">ログなし</p>}
      </div>
    </section>
  );
}
