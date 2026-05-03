import type {
  GitInstallPayload,
  InstallPluginResult,
  PluginListItem,
} from "@shared/types";

type PluginStateSnapshot = {
  plugins: PluginListItem[];
  pluginPanels: PluginListItem[];
};

type InstallActionResult = {
  changed: boolean;
  message?: string;
};

export async function refreshPluginState(): Promise<PluginStateSnapshot> {
  const [plugins, pluginPanels] = await Promise.all([
    window.m3u8Viewer.plugins.list(),
    window.m3u8Viewer.plugins.listPanels(),
  ]);
  return { plugins, pluginPanels };
}

export async function setPluginEnabled(
  pluginId: string,
  enabled: boolean,
): Promise<PluginStateSnapshot> {
  await window.m3u8Viewer.plugins.setEnabled(pluginId, enabled);
  return refreshPluginState();
}

export async function reorderPluginState(
  orderedIds: string[],
): Promise<PluginStateSnapshot> {
  await window.m3u8Viewer.plugins.reorder(orderedIds);
  return refreshPluginState();
}

export async function removePluginState(
  pluginId: string,
): Promise<PluginStateSnapshot> {
  await window.m3u8Viewer.plugins.remove(pluginId);
  return refreshPluginState();
}

export async function updatePluginState(
  pluginId: string,
): Promise<PluginStateSnapshot> {
  await window.m3u8Viewer.plugins.update(pluginId);
  return refreshPluginState();
}

export async function installPluginFromZip(): Promise<InstallActionResult> {
  const selected = await window.m3u8Viewer.plugins.pickZip();
  if (!selected) {
    return { changed: false };
  }

  const result = await window.m3u8Viewer.plugins.installFromZip(selected);
  return {
    changed: true,
    message: formatInstallResultMessage(result),
  };
}

export async function installPluginFromFolder(): Promise<InstallActionResult> {
  const selected = await window.m3u8Viewer.plugins.pickFolder();
  if (!selected) {
    return { changed: false };
  }

  const result = await window.m3u8Viewer.plugins.installFromFolder(selected);
  return {
    changed: true,
    message: formatInstallResultMessage(result),
  };
}

export async function installPluginFromGit(
  payload: GitInstallPayload,
): Promise<InstallActionResult> {
  try {
    const result = await window.m3u8Viewer.plugins.installFromGit(payload);
    return {
      changed: true,
      message: formatInstallResultMessage(result),
    };
  } catch (error) {
    const reason = classifyGitInstallError(error);
    return {
      changed: false,
      message: `導入失敗: ${reason}`,
    };
  }
}

function formatInstallResultMessage(result: InstallPluginResult): string {
  return result.status === "installed"
    ? `導入: ${result.plugin.manifest.name}`
    : `導入失敗: ${result.reason}`;
}

function classifyGitInstallError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("duplicate-plugin-id")) {
    return "duplicate-plugin-id";
  }
  if (lower.includes("plugin-entry-load-failed")) {
    return "plugin-entry-load-failed";
  }
  if (
    lower.includes("clone") ||
    lower.includes("auth") ||
    lower.includes("repository") ||
    lower.includes("not found")
  ) {
    return "git-clone-failed";
  }
  return "unknown";
}
