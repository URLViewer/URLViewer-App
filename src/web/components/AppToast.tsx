import { Icon } from "@web/components/Icon";

type AppToastProps = {
  level: "success" | "error";
  message: string;
  onClose: () => void;
};

export function AppToast({ level, message, onClose }: AppToastProps) {
  return (
    <div className={`app-toast ${level === "success" ? "app-toast-success" : "app-toast-error"}`} role="status" aria-live="polite">
      <div className="app-toast-level-wrap">
        <span className="app-toast-level-icon" aria-hidden="true">
          <Icon name={level === "success" ? "check" : "x"} className="h-3.5 w-3.5" />
        </span>
        <span className="app-toast-level-text">{level === "success" ? "成功" : "エラー"}</span>
      </div>
      <p className="app-toast-message" title={message}>
        {message}
      </p>
      <button className="app-toast-close" onClick={onClose} type="button" aria-label="通知を閉じる">
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}
