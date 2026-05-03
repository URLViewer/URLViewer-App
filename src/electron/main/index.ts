import { app, BrowserWindow, Menu } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { registerIpcHandlers, cleanupIpcHandlers } from "@electron/ipc/handlers";
import { PluginManager } from "@electron/services/pluginManager";
import { AppStoreService } from "@electron/store/appStore";
import { createUpdateProvider } from "@electron/updater/provider";

const currentDir = __dirname;
const store = new AppStoreService();
const pluginManager = new PluginManager(store);
const updateProvider = createUpdateProvider();

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
