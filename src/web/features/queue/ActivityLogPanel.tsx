import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";
import { useState } from "react";

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
  const [selectedDetail, setSelectedDetail] = useState<{ title: string; detail: string } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  const closeDetail = () => {
    setSelectedDetail(null);
    setCopyState("idle");
  };

  const copyDetail = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyState("success");
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <>
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
          {activityLogs.map((log) => {
            const detail = log.detail;
            return (
              <div key={log.id} className={`queue-log-row queue-log-${log.level}`}>
                <div className="queue-log-head">
                  <span className="queue-log-time">{formatLogTime(log.at)}</span>
                  <span className="queue-log-scope">{log.scope}</span>
                </div>
                <div className="queue-log-message">{log.message}</div>
                {detail && (
                  <div className="queue-log-actions">
                    <button
                      className="queue-log-detail-btn"
                      onClick={() => setSelectedDetail({ title: `${log.scope} の詳細`, detail })}
                      type="button"
                    >
                      詳細を見る
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {activityLogs.length === 0 && <p className="empty-text !py-3 !text-slate-400">ログなし</p>}
        </div>
      </section>

      {selectedDetail && (
        <div className="floating-overlay" onClick={closeDetail}>
          <div className="floating-dialog log-detail-dialog floating-enter" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-slate-800">{selectedDetail.title}</p>
            <pre className="log-detail-pre">{selectedDetail.detail}</pre>
            <div className="dialog-actions">
              <button className="dialog-btn dialog-btn-neutral" onClick={closeDetail}>
                閉じる
              </button>
              <button className="dialog-btn dialog-btn-neutral" onClick={() => void copyDetail(selectedDetail.detail)}>
                {copyState === "success" ? "コピー済み" : "コピー"}
              </button>
            </div>
            {copyState === "error" && <p className="mt-1 text-xs text-rose-600">コピーに失敗しました。</p>}
          </div>
        </div>
      )}
    </>
  );
}
