import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import type { UpdaterTelemetryEvent } from "@shared/types";

export interface UpdateProvider {
  checkForUpdates(): Promise<{ enabled: boolean; message: string }>;
}

type UpdateProviderOptions = {
  checkOnStartup?: boolean;
  onTelemetry?: (event: UpdaterTelemetryEvent) => void;
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

  private emit(event: Omit<UpdaterTelemetryEvent, "at">): void {
    this.options.onTelemetry?.({
      ...event,
      at: new Date().toISOString(),
    });
  }

  private wireEvents(): void {
    if (this.wired) {
      return;
    }

    autoUpdater.on("checking-for-update", () => {
      console.info("[updater] checking-for-update");
      this.emit({
        level: "info",
        type: "checking",
        message: "アップデートを確認中です。",
      });
    });
    autoUpdater.on("update-available", (info) => {
      console.info(`[updater] update-available version=${info.version}`);
      this.emit({
        level: "success",
        type: "available",
        message: `アップデートが見つかりました: ${info.version}`,
      });
    });
    autoUpdater.on("update-not-available", (info) => {
      console.info(`[updater] update-not-available current=${app.getVersion()} latest=${info.version}`);
      this.emit({
        level: "info",
        type: "not-available",
        message: `アップデートなし（現在 ${app.getVersion()} / 最新 ${info.version}）`,
      });
    });
    autoUpdater.on("error", (error) => {
      console.error("[updater] error", error);
      this.emit({
        level: "error",
        type: "runtime-error",
        message: "アップデート処理でエラーが発生しました。",
        detail: formatUpdaterErrorDetail(error),
      });
    });
    autoUpdater.on("download-progress", (progress) => {
      console.info(
        `[updater] download-progress ${progress.percent.toFixed(2)}% (${progress.transferred}/${progress.total})`,
      );
      this.emit({
        level: "info",
        type: "download-progress",
        message: `アップデートをダウンロード中: ${progress.percent.toFixed(1)}%`,
        detail: `transferred=${progress.transferred} total=${progress.total} bytesPerSecond=${progress.bytesPerSecond}`,
      });
    });
    autoUpdater.on("update-downloaded", async (info) => {
      console.info(`[updater] update-downloaded version=${info.version}`);
      this.emit({
        level: "success",
        type: "downloaded",
        message: `アップデートのダウンロード完了: ${info.version}`,
      });
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
      this.emit({
        level: "error",
        type: "check-failed",
        message: `アップデート確認に失敗しました: ${message}`,
        detail: formatUpdaterErrorDetail(error),
      });
      return {
        enabled: true,
        message: `Auto update check failed: ${message}`,
      };
    }
  }
}

export function createUpdateProvider(
  onTelemetry?: (event: UpdaterTelemetryEvent) => void,
): UpdateProvider {
  if (process.env.URLVIEWER_DISABLE_UPDATER === "1") {
    return new NoopUpdateProvider("Updater is disabled by URLVIEWER_DISABLE_UPDATER.");
  }

  if (!app.isPackaged && process.env.URLVIEWER_ENABLE_DEV_UPDATER !== "1") {
    return new NoopUpdateProvider("Updater is disabled in development mode.");
  }

  return new ElectronAutoUpdateProvider({ checkOnStartup: true, onTelemetry });
}

function formatUpdaterErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return [error.name, error.message, error.stack ?? ""].filter(Boolean).join("\n");
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}
