import { Icon } from "@web/components/Icon";
import type { PluginListItem } from "@shared/types";
import { useAppStore } from "@web/store/appStore";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

export function PluginManagerPanel() {
  const [mode, setMode] = useState<"install" | "list">("install");
  const [gitUrl, setGitUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [selectedPlugin, setSelectedPlugin] = useState<PluginListItem | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const previousTopByIdRef = useRef<Map<string, number>>(new Map());

  const plugins = useAppStore((state) => state.plugins);
  const busy = useAppStore((state) => state.busy);
  const refreshPlugins = useAppStore((state) => state.refreshPlugins);
  const setPluginEnabled = useAppStore((state) => state.setPluginEnabled);
  const reorderPlugins = useAppStore((state) => state.reorderPlugins);
  const removePlugin = useAppStore((state) => state.removePlugin);
  const updatePlugin = useAppStore((state) => state.updatePlugin);
  const installPluginFromZip = useAppStore((state) => state.installPluginFromZip);
  const installPluginFromFolder = useAppStore((state) => state.installPluginFromFolder);
  const installPluginFromGit = useAppStore((state) => state.installPluginFromGit);

  const sorted = useMemo(() => [...plugins].sort((a, b) => a.order - b.order), [plugins]);

  const closeDetailDialog = () => setSelectedPlugin(null);

  const PLUGIN_ITEM_ANIMATION_DURATION = 450;

  useLayoutEffect(() => {
    if (mode !== "list") {
      previousTopByIdRef.current = new Map();
      return;
    }

    const nextTopById = new Map<string, number>();
    for (const plugin of sorted) {
      const node = itemRefs.current.get(plugin.id);
      if (!node) {
        continue;
      }
      nextTopById.set(plugin.id, node.getBoundingClientRect().top);
    }

    const previousTopById = previousTopByIdRef.current;
    if (previousTopById.size > 0) {
      for (const plugin of sorted) {
        const node = itemRefs.current.get(plugin.id);
        const previousTop = previousTopById.get(plugin.id);
        const nextTop = nextTopById.get(plugin.id);
        if (!node || previousTop === undefined || nextTop === undefined) {
          continue;
        }

        const deltaY = previousTop - nextTop;
        if (Math.abs(deltaY) < 1) {
          continue;
        }

        const animation = node.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: PLUGIN_ITEM_ANIMATION_DURATION,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
        node.classList.add("plugin-item-moving");
        animation.onfinish = () => node.classList.remove("plugin-item-moving");
        animation.oncancel = () => node.classList.remove("plugin-item-moving");
      }
    }

    previousTopByIdRef.current = nextTopById;
  }, [mode, sorted]);

  return (
    <section className="space-y-3">
      <div className="panel-shell">
        <div className="mb-3 flex items-center justify-between">
          <span className="panel-title">プラグイン</span>
          <button className="icon-btn-sm" title="再読込" onClick={() => void refreshPlugins()} disabled={busy}>
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        </div>

        <div className="plugin-mode-switch">
          <button
            className={`plugin-mode-btn ${mode === "install" ? "plugin-mode-btn-active" : ""}`}
            onClick={() => setMode("install")}
            type="button"
          >
            導入
          </button>
          <button
            className={`plugin-mode-btn ${mode === "list" ? "plugin-mode-btn-active" : ""}`}
            onClick={() => setMode("list")}
            type="button"
          >
            一覧
          </button>
        </div>
      </div>

      {mode === "install" && (
        <>
          <div className="panel-shell">
            <div className="plugin-block-title">ローカル導入</div>
            <div className="plugin-action-row">
              <button
                className="plugin-action-btn"
                onClick={() => void installPluginFromZip()}
                type="button"
                disabled={busy}
              >
                ZIPから追加
              </button>
              <button
                className="plugin-action-btn"
                onClick={() => void installPluginFromFolder()}
                type="button"
                disabled={busy}
              >
                フォルダから追加
              </button>
            </div>
          </div>

          <div className="panel-shell">
            <div className="plugin-block-title">Git導入</div>
            <div className="space-y-2">
              <input
                className="panel-input w-full"
                placeholder="Git URL"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
              />
              <input
                className="panel-input w-full"
                placeholder="Branch (任意)"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
              />
              <input
                className="panel-input w-full"
                placeholder="Token (private用)"
                value={gitToken}
                onChange={(e) => setGitToken(e.target.value)}
              />
              <button
                className="plugin-action-btn plugin-action-btn-full"
                onClick={() => void installPluginFromGit(gitUrl, gitBranch || undefined, gitToken || undefined)}
                type="button"
                disabled={busy || gitUrl.trim().length === 0}
              >
                Gitから追加
              </button>
            </div>
          </div>
        </>
      )}

      {mode === "list" && (
        <div className="space-y-2">
          {sorted.length === 0 && <p className="empty-text">プラグインなし</p>}
          {sorted.map((plugin, index) => (
            <article
              key={plugin.id}
              className="panel-shell plugin-item-card"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlugin(plugin)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedPlugin(plugin);
                }
              }}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(plugin.id, node);
                  return;
                }
                itemRefs.current.delete(plugin.id);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{plugin.manifest.name}</div>
                  <div className="text-xs text-slate-500">
                    {plugin.id} · v{plugin.manifest.version} · {plugin.sourceType}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="icon-btn-sm"
                    title="上へ"
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      const ids = [...sorted.map((item) => item.id)];
                      [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                      void reorderPlugins(ids);
                    }}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    className="icon-btn-sm"
                    title="下へ"
                    disabled={index === sorted.length - 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      const ids = [...sorted.map((item) => item.id)];
                      [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                      void reorderPlugins(ids);
                    }}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className={`plugin-toggle ${plugin.enabled ? "plugin-toggle-on" : "plugin-toggle-off"}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void setPluginEnabled(plugin.id, !plugin.enabled);
                  }}
                  type="button"
                  role="switch"
                  aria-checked={plugin.enabled}
                  title={plugin.enabled ? "OFFにする" : "ONにする"}
                >
                  <span className="plugin-toggle-label">{plugin.enabled ? "ON" : "OFF"}</span>
                  <span className="plugin-toggle-track">
                    <span className="plugin-toggle-thumb" />
                  </span>
                </button>
                {plugin.sourceType === "git" && (
                  <button
                    className="plugin-action-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      void updatePlugin(plugin.id);
                    }}
                    type="button"
                  >
                    更新
                  </button>
                )}
                {plugin.sourceType !== "builtin" && (
                  <button
                    className="plugin-action-btn plugin-action-btn-danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      void removePlugin(plugin.id);
                    }}
                    type="button"
                  >
                    削除
                  </button>
                )}
              </div>
              <div className="plugin-info-wrap" onClick={(event) => event.stopPropagation()}>
                <span className="plugin-info-badge" aria-hidden="true">
                  i
                </span>
                <div className="plugin-info-tooltip">
                  {plugin.manifest.description?.summary?.trim() || "説明は未設定です。"}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedPlugin && (
        <div className="floating-overlay" onClick={closeDetailDialog}>
          <div
            className="floating-dialog plugin-detail-dialog floating-enter"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="plugin-detail-head">
              <div>
                <div className="plugin-detail-title">{selectedPlugin.manifest.name}</div>
                <div className="plugin-detail-sub">
                  {selectedPlugin.id} · v{selectedPlugin.manifest.version}
                </div>
              </div>
              <button className="icon-btn-sm" title="閉じる" onClick={closeDetailDialog} type="button">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="plugin-detail-body">
              <section className="plugin-detail-section">
                <div className="plugin-detail-label">概要</div>
                <p className="plugin-detail-text">
                  {selectedPlugin.manifest.description?.summary?.trim() || "説明は未設定です。"}
                </p>
              </section>

              <section className="plugin-detail-section">
                <div className="plugin-detail-label">詳細説明</div>
                <p className="plugin-detail-text">
                  {selectedPlugin.manifest.description?.detailed?.trim() || "詳細説明は未設定です。"}
                </p>
              </section>

              <section className="plugin-detail-section">
                <div className="plugin-detail-label">マニフェスト情報</div>
                <ul className="plugin-detail-list">
                  <li><strong>ID:</strong> {selectedPlugin.manifest.id}</li>
                  <li><strong>Version:</strong> {selectedPlugin.manifest.version}</li>
                  <li><strong>API:</strong> {selectedPlugin.manifest.apiVersion}</li>
                  <li><strong>Entry:</strong> {selectedPlugin.manifest.entry}</li>
                  <li><strong>Capabilities:</strong> {selectedPlugin.manifest.capabilities.join(", ")}</li>
                  <li><strong>Source:</strong> {selectedPlugin.sourceType}</li>
                  <li><strong>Author:</strong> {selectedPlugin.manifest.author?.name ?? "未設定"}</li>
                  {selectedPlugin.manifest.author?.url && (
                    <li><strong>Author URL:</strong> {selectedPlugin.manifest.author.url}</li>
                  )}
                  {selectedPlugin.manifest.homepage && (
                    <li><strong>Homepage:</strong> {selectedPlugin.manifest.homepage}</li>
                  )}
                  {selectedPlugin.manifest.repository && (
                    <li><strong>Repository:</strong> {selectedPlugin.manifest.repository}</li>
                  )}
                  <li><strong>License:</strong> {selectedPlugin.manifest.license ?? "未設定"}</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
