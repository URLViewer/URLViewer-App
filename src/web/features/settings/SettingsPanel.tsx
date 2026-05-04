import { Icon } from "@web/components/Icon";
import type { AppSettings } from "@shared/types";

type SettingsPanelProps = {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
};

export function SettingsPanel({ open, settings, onClose, onSave }: SettingsPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/10 backdrop-blur-sm">
      <div className="w-[34rem] max-w-[92vw] rounded-2xl border border-slate-300 bg-white p-5 text-slate-800 shadow-2xl shadow-slate-300/50 animate-in-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-wide text-slate-800">設定</h2>
          <button className="icon-btn-sm" onClick={onClose} title="閉じる">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="settings-col gap-2 rounded-xl border border-slate-200 p-3">
            <span className="text-sm font-semibold text-slate-700">起動時に復元するもの</span>
            <label className="settings-row">
              <span>タブ</span>
              <input
                type="checkbox"
                checked={settings.restoreTabsOnLaunch}
                onChange={(event) =>
                  void onSave({
                    ...settings,
                    restoreTabsOnLaunch: event.target.checked,
                  })
                }
              />
            </label>
            <label className="settings-row">
              <span>再生していた動画</span>
              <input
                type="checkbox"
                checked={settings.restorePlaybackOnLaunch}
                onChange={(event) =>
                  void onSave({
                    ...settings,
                    restorePlaybackOnLaunch: event.target.checked,
                  })
                }
              />
            </label>
            <label className="settings-row">
              <span>ライブラリの並び替え</span>
              <input
                type="checkbox"
                checked={settings.restoreLibrarySortOnLaunch}
                onChange={(event) =>
                  void onSave({
                    ...settings,
                    restoreLibrarySortOnLaunch: event.target.checked,
                  })
                }
              />
            </label>
          </div>

          <label className="settings-col">
            <span>検証タイミング</span>
            <select
              className="panel-select w-full"
              value={settings.validationMode}
              onChange={(event) =>
                void onSave({
                  ...settings,
                  validationMode: event.target.value as AppSettings["validationMode"],
                })
              }
            >
              <option value="on-register">登録時</option>
              <option value="manual">手動</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="settings-col">
              <span>同時検証数</span>
              <input
                className="panel-input w-full"
                type="number"
                min={1}
                max={8}
                value={settings.validationConcurrency}
                onChange={(event) =>
                  void onSave({
                    ...settings,
                    validationConcurrency: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="settings-col">
              <span>タイムアウト(ms)</span>
              <input
                className="panel-input w-full"
                type="number"
                min={1000}
                max={20000}
                step={500}
                value={settings.validationTimeoutMs}
                onChange={(event) =>
                  void onSave({
                    ...settings,
                    validationTimeoutMs: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
