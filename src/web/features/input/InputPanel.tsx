import { Icon } from "@web/components/Icon";
import { useAppStore } from "@web/store/appStore";

export function InputPanel() {
  const urlInput = useAppStore((state) => state.urlInput);
  const pluginPanels = useAppStore((state) => state.pluginPanels);
  const pluginInput = useAppStore((state) => state.pluginInput);
  const busy = useAppStore((state) => state.busy);
  const setUrlInput = useAppStore((state) => state.setUrlInput);
  const registerUrlInput = useAppStore((state) => state.registerUrlInput);
  const setPluginInput = useAppStore((state) => state.setPluginInput);
  const runPluginInput = useAppStore((state) => state.runPluginInput);

  return (
    <section className="space-y-3">
      <div className="panel-shell">
        <div className="mb-2 flex items-center justify-between">
          <span className="panel-title">URL入力</span>
          <button className="icon-btn-sm" title="追加" onClick={() => void registerUrlInput()} disabled={busy}>
            <Icon name="check" className="h-4 w-4" />
          </button>
        </div>
        <textarea
          className="panel-textarea"
          placeholder="https://example.com/video-or-stream"
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
        />
      </div>

      {pluginPanels.map((plugin) => (
        <div key={plugin.id} className="panel-shell">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="panel-title">{plugin.panel?.title ?? plugin.manifest.name}</div>
              {plugin.panel?.description && (
                <div className="text-xs text-slate-500">{plugin.panel.description}</div>
              )}
            </div>
            <button
              className="icon-btn-sm"
              title={plugin.panel?.submitLabel ?? "実行"}
              onClick={() => void runPluginInput(plugin.id)}
              disabled={busy}
            >
              <Icon name="check" className="h-4 w-4" />
            </button>
          </div>
          <label className="mb-1 block text-xs text-slate-600">
            {plugin.panel?.inputLabel ?? "入力"}
          </label>
          <textarea
            className="panel-textarea"
            placeholder={plugin.panel?.inputPlaceholder ?? ""}
            value={pluginInput[plugin.id] ?? ""}
            onChange={(event) => setPluginInput(plugin.id, event.target.value)}
          />
        </div>
      ))}
    </section>
  );
}
