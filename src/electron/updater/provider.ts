import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

export interface UpdateProvider {
  checkForUpdates(): Promise<{ enabled: boolean; message: string }>;
}

type UpdateProviderOptions = {
  checkOnStartup?: boolean;
};

export class NoopUpdateProvider implements UpdateProvider {
  constructor(private readonly reason: string) {}

  async checkForUpdates(): Promise<{ enabled: boolean; message: string }> {
    return {
      enabled: false,
      message: this.reason,
    };
  }
}

export class ElectronAutoUpdateProvider implements UpdateProvider {
  private wired = false;

  constructor(private readonly options: UpdateProviderOptions = {}) {}

  private wireEvents(): void {
    if (this.wired) {
      return;
    }

    autoUpdater.on("checking-for-update", () => {
      console.info("[updater] checking-for-update");
    });
    autoUpdater.on("update-available", (info) => {
      console.info(`[updater] update-available version=${info.version}`);
    });
    autoUpdater.on("update-not-available", (info) => {
      console.info(`[updater] update-not-available current=${app.getVersion()} latest=${info.version}`);
    });
    autoUpdater.on("error", (error) => {
      console.error("[updater] error", error);
    });
    autoUpdater.on("download-progress", (progress) => {
      console.info(
        `[updater] download-progress ${progress.percent.toFixed(2)}% (${progress.transferred}/${progress.total})`,
      );
    });
    autoUpdater.on("update-downloaded", async (info) => {
      console.info(`[updater] update-downloaded version=${info.version}`);
      const result = await dialog.showMessageBox({
        type: "info",
        title: "アップデートの準備が完了しました",
        message: `新しいバージョン (${info.version}) をインストールできます。`,
        detail: "今すぐ再起動して更新を適用しますか？",
        buttons: ["今すぐ再起動", "あとで"],
        defaultId: 0,
        cancelId: 1,
      });
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });

    this.wired = true;
  }

  async checkForUpdates(): Promise<{ enabled: boolean; message: string }> {
    if (this.options.checkOnStartup === false) {
      return {
        enabled: true,
        message: "Auto update startup check is disabled by option.",
      };
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = process.env.URLVIEWER_ALLOW_PRERELEASE_UPDATES === "1";
    this.wireEvents();

    try {
      await autoUpdater.checkForUpdates();
      return {
        enabled: true,
        message: "Auto update check started.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown updater error";
      console.error("[updater] check failed", error);
      return {
        enabled: true,
        message: `Auto update check failed: ${message}`,
      };
    }
  }
}

export function createUpdateProvider(): UpdateProvider {
  if (process.env.URLVIEWER_DISABLE_UPDATER === "1") {
    return new NoopUpdateProvider("Updater is disabled by URLVIEWER_DISABLE_UPDATER.");
  }

  if (!app.isPackaged && process.env.URLVIEWER_ENABLE_DEV_UPDATER !== "1") {
    return new NoopUpdateProvider("Updater is disabled in development mode.");
  }

  return new ElectronAutoUpdateProvider({ checkOnStartup: true });
}
