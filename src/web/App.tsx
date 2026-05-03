import { Icon } from "@web/components/Icon";
import { GroupPanel } from "@web/features/groups/GroupPanel";
import { InputPanel } from "@web/features/input/InputPanel";
import { LibraryPanel } from "@web/features/library/LibraryPanel";
import { VideoPlayer } from "@web/features/player/VideoPlayer";
import { PluginManagerPanel } from "@web/features/plugins/PluginManagerPanel";
import { ActivityLogPanel } from "@web/features/queue/ActivityLogPanel";
import { ValidationQueuePanel } from "@web/features/queue/ValidationQueuePanel";
import { SettingsPanel } from "@web/features/settings/SettingsPanel";
import { VideoTabs } from "@web/features/tabs/VideoTabs";
import { useAppStore } from "@web/store/appStore";
import { useEffect, useRef, useState } from "react";

export function App() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(true);
  const [isDrawerContentVisible, setDrawerContentVisible] = useState(true);
  const [isValidateConfirmOpen, setValidateConfirmOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"queue" | "log" | null>(null);
  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loaded = useAppStore((state) => state.loaded);
  const settings = useAppStore((state) => state.settings);
  const currentPanel = useAppStore((state) => state.currentPanel);
  const appVersion = useAppStore((state) => state.appVersion);
  const busy = useAppStore((state) => state.busy);
  const videos = useAppStore((state) => state.library.videos);
  const pendingValidationsCount = useAppStore((state) => state.pendingValidations.length);
  const loadInitialData = useAppStore((state) => state.loadInitialData);
  const saveSettings = useAppStore((state) => state.saveSettings);
  const setPanel = useAppStore((state) => state.setPanel);
  const validateAllPending = useAppStore((state) => state.validateAllPending);
  const exportAliveUrls = useAppStore((state) => state.exportAliveUrls);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    return () => {
      if (drawerTimerRef.current) {
        clearTimeout(drawerTimerRef.current);
      }
    };
  }, []);

  const openDrawer = () => {
    if (drawerTimerRef.current) {
      clearTimeout(drawerTimerRef.current);
      drawerTimerRef.current = null;
    }
    setDrawerOpen(true);
    drawerTimerRef.current = setTimeout(() => {
      setDrawerContentVisible(true);
      drawerTimerRef.current = null;
    }, 180);
  };

  const closeDrawer = () => {
    if (drawerTimerRef.current) {
      clearTimeout(drawerTimerRef.current);
      drawerTimerRef.current = null;
    }
    setDrawerContentVisible(false);
    setDrawerOpen(false);
  };

  const toggleDrawer = () => {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  useEffect(() => {
    const unsubscribe = window.m3u8Viewer.app.onCloseActiveTabShortcut(() => {
      const state = useAppStore.getState();
      const activeId = state.library.tabs.activeVideoId;
      if (!activeId) {
        return;
      }

      void state.closeVideoTab(activeId);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const openValidateConfirm = () => {
    if (settings.validationMode === "on-register") {
      if (videos.length === 0) {
        void validateAllPending();
        return;
      }
      setValidateConfirmOpen(true);
      return;
    }

    if (pendingValidationsCount === 0) {
      void validateAllPending();
      return;
    }
    setValidateConfirmOpen(true);
  };

  const validateConfirmMessage =
    settings.validationMode === "on-register"
      ? `${videos.length}件の登録URLを再検証します。実行しますか？`
      : `${pendingValidationsCount}件の検証待ちURLを検証します。実行しますか？`;

  if (!loaded) {
    return <div className="grid min-h-screen place-items-center text-slate-500">読み込み中...</div>;
  }

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="flex items-center gap-2">
            <Icon name="play" className="h-5 w-5 text-teal-700" />
            <span className="app-title">URL ビューア</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="icon-btn" title="プラグイン" onClick={() => { setPanel("plugins"); openDrawer(); }}>
              <Icon name="speed" />
            </button>
            <button className="icon-btn" title="検証実行" disabled={busy} onClick={openValidateConfirm}>
              <Icon name="bolt" />
            </button>
            <button className="icon-btn" title="生存URLをエクスポート" onClick={() => void exportAliveUrls()}>
              <Icon name="download" />
            </button>
            <button
              className={`icon-btn ${rightPanel === "queue" ? "selection-btn-active" : ""}`}
              title="キュー"
              onClick={() => setRightPanel((current) => (current === "queue" ? null : "queue"))}
            >
              <Icon name="queue" />
            </button>
            <button
              className={`icon-btn ${rightPanel === "log" ? "selection-btn-active" : ""}`}
              title="ログ"
              onClick={() => setRightPanel((current) => (current === "log" ? null : "log"))}
            >
              <Icon name="log" />
            </button>
            <button className="icon-btn" title="設定" onClick={() => setSettingsOpen(true)}>
              <Icon name="settings" />
            </button>
          </div>
        </header>

        <div className={`content-shell ${isDrawerOpen ? "content-shell-open" : "content-shell-collapsed"}`}>
          <aside className={`left-drawer animate-in-left ${isDrawerOpen ? "" : "left-drawer-collapsed"}`}>
            <div className={`drawer-head ${isDrawerOpen ? "" : "drawer-head-collapsed"}`}>
              <button
                className="icon-btn-sm"
                title={isDrawerOpen ? "パネルを折りたたむ" : "パネルを展開"}
                onClick={toggleDrawer}
              >
                <Icon name={isDrawerOpen ? "close" : "menu"} className="h-4 w-4" />
              </button>

              <div className={`drawer-tab-group ${isDrawerOpen ? "" : "drawer-tab-group-collapsed"}`}>
                <button
                  className={`drawer-tab ${currentPanel === "input" ? "drawer-tab-active" : ""}`}
                  title="入力"
                  onClick={() => setPanel("input")}
                >
                  <Icon name="plus" className="h-5 w-5" />
                </button>
                <button
                  className={`drawer-tab ${currentPanel === "library" ? "drawer-tab-active" : ""}`}
                  title="ライブラリ"
                  onClick={() => setPanel("library")}
                >
                  <Icon name="library" className="h-5 w-5" />
                </button>
                <button
                  className={`drawer-tab ${currentPanel === "groups" ? "drawer-tab-active" : ""}`}
                  title="グループ"
                  onClick={() => setPanel("groups")}
                >
                  <Icon name="group" className="h-5 w-5" />
                </button>
                <button
                  className={`drawer-tab ${currentPanel === "plugins" ? "drawer-tab-active" : ""}`}
                  title="プラグイン"
                  onClick={() => setPanel("plugins")}
                >
                  <Icon name="speed" className="h-5 w-5" />
                </button>
              </div>
            </div>

            {isDrawerContentVisible && (
              <div className="drawer-content h-[calc(100%-56px)] overflow-y-auto pr-1">
                {currentPanel === "input" && <InputPanel />}
                {currentPanel === "library" && <LibraryPanel />}
                {currentPanel === "groups" && <GroupPanel />}
                {currentPanel === "plugins" && <PluginManagerPanel />}
              </div>
            )}
          </aside>

          <main className="main-view">
            <div className="tabs-top-wrap">
              <VideoTabs />
            </div>
            <div className="player-wrap animate-in-up">
              <VideoPlayer />
            </div>
            <div className="px-1 text-right text-[10px] text-slate-500">v{appVersion}</div>
          </main>

          {rightPanel === "queue" && (
            <aside className="right-queue animate-in-right">
              <ValidationQueuePanel onClose={() => setRightPanel(null)} />
            </aside>
          )}

          {rightPanel === "log" && (
            <aside className="right-queue animate-in-right">
              <ActivityLogPanel onClose={() => setRightPanel(null)} />
            </aside>
          )}
        </div>
      </div>

      <SettingsPanel
        open={isSettingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />

      {isValidateConfirmOpen && (
        <div className="floating-overlay" onClick={() => setValidateConfirmOpen(false)}>
          <div className="floating-dialog floating-enter" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-slate-800">検証実行の確認</p>
            <p className="mt-2 text-xs text-slate-600">{validateConfirmMessage}</p>
            <div className="dialog-actions">
              <button
                className="dialog-btn dialog-btn-neutral"
                onClick={() => setValidateConfirmOpen(false)}
              >
                キャンセル
              </button>
              <button
                className="dialog-btn dialog-btn-danger"
                onClick={() => {
                  setValidateConfirmOpen(false);
                  void validateAllPending();
                }}
              >
                実行する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
