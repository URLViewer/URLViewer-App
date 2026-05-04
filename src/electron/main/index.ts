import { app, BrowserWindow, Menu, type Session } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { registerIpcHandlers, cleanupIpcHandlers } from "@electron/ipc/handlers";
import { PluginManager } from "@electron/services/pluginManager";
import { applyNetworkHeaderOverrides } from "@electron/services/networkHeaderOverrideManager";
import {
  recordPlaybackTraceCompleted,
  recordPlaybackTraceFailed,
} from "@electron/services/videoNetworkTrace";
import { AppStoreService } from "@electron/store/appStore";
import { createUpdateProvider } from "@electron/updater/provider";
import type { UpdaterTelemetryEvent } from "@shared/types";

const currentDir = __dirname;
const store = new AppStoreService();
const pluginManager = new PluginManager(store);
const updateProvider = createUpdateProvider((event) => broadcastUpdaterEvent(event));
let headerOverrideHookInstalled = false;
let twitterTraceHookInstalled = false;

function broadcastUpdaterEvent(event: UpdaterTelemetryEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue;
    }
    window.webContents.send("updater:event", event);
  }
}

function resolveWindowIconPath(): string | undefined {
  const candidates = [
    path.join(process.cwd(), "build", "icon.ico"),
    path.join(process.cwd(), "build", "icon.png"),
    path.resolve(currentDir, "../../../build/icon.ico"),
    path.resolve(currentDir, "../../../build/icon.png"),
    path.join(app.getAppPath(), "build", "icon.ico"),
    path.join(app.getAppPath(), "build", "icon.png"),
    path.join(process.resourcesPath, "build", "icon.ico"),
    path.join(process.resourcesPath, "build", "icon.png"),
    path.join(process.resourcesPath, "icon.ico"),
    path.join(process.resourcesPath, "icon.png"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

async function createWindow(): Promise<void> {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const windowIconPath = resolveWindowIconPath();
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: "#f4fdfa",
    autoHideMenuBar: true,
    icon: windowIconPath,
    webPreferences: {
      preload: path.join(currentDir, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  installHeaderOverrideHook(mainWindow.webContents.session);
  installTwitterVideoTraceHook(mainWindow.webContents.session);

  if (!devServerUrl) {
    mainWindow.setMenuBarVisibility(false);
  }

  if (windowIconPath) {
    mainWindow.setIcon(windowIconPath);
  }

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(currentDir, "../../dist/index.html"));
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const isCloseTabShortcut =
      input.type === "keyDown" &&
      (input.control || input.meta) &&
      input.key.toLowerCase() === "w";

    if (!isCloseTabShortcut) {
      return;
    }

    event.preventDefault();
    mainWindow.webContents.send("app:close-active-tab");
  });

  const updateStatus = await updateProvider.checkForUpdates();
  console.info(`[updater] enabled=${updateStatus.enabled} message=${updateStatus.message}`);
  broadcastUpdaterEvent({
    at: new Date().toISOString(),
    level: updateStatus.enabled ? "info" : "error",
    type: "status",
    message: updateStatus.message,
  });
}

function installHeaderOverrideHook(session: Session): void {
  if (headerOverrideHookInstalled) {
    return;
  }
  headerOverrideHookInstalled = true;

  session.webRequest.onBeforeSendHeaders(
    { urls: ["*://*/*"] },
    (details, callback) => {
      const headers = applyNetworkHeaderOverrides(
        details.url,
        details.requestHeaders as Record<string, string | string[]>,
      );
      callback({ requestHeaders: headers });
    },
  );
}

function installTwitterVideoTraceHook(session: Session): void {
  if (twitterTraceHookInstalled) {
    return;
  }
  twitterTraceHookInstalled = true;

  session.webRequest.onCompleted(
    {
      urls: ["https://video.twimg.com/*"],
    },
    (details) => {
      recordPlaybackTraceCompleted({
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        resourceType: details.resourceType,
        fromCache: details.fromCache,
        referrer: details.referrer,
        responseHeaders: details.responseHeaders,
      });
    },
  );

  session.webRequest.onErrorOccurred(
    {
      urls: ["https://video.twimg.com/*"],
    },
    (details) => {
      recordPlaybackTraceFailed({
        url: details.url,
        method: details.method,
        error: details.error,
        resourceType: details.resourceType,
        referrer: details.referrer,
      });
    },
  );
}

app.whenReady().then(async () => {
  if (!process.env.VITE_DEV_SERVER_URL) {
    Menu.setApplicationMenu(null);
  }

  registerIpcHandlers(store, pluginManager);
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  cleanupIpcHandlers();
});
