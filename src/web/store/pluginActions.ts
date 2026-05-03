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
  detail?: string;
};

type GitInstallErrorInfo = {
  code: string;
  summary: string;
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
    const detail = formatErrorDetail(error);
    return {
      changed: false,
      message: `導入失敗: ${reason.summary}`,
      detail,
    };
  }
}

function formatInstallResultMessage(result: InstallPluginResult): string {
  return result.status === "installed"
    ? `導入: ${result.plugin.manifest.name}`
    : `導入失敗: ${result.reason}`;
}

function classifyGitInstallError(error: unknown): GitInstallErrorInfo {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("plugin-manifest-not-found")) {
    return {
      code: "plugin-manifest-not-found",
      summary: "plugin.json が見つかりません（tree URL でプラグインフォルダを指定してください）",
    };
  }
  if (lower.includes("plugin-manifest-invalid-json")) {
    return {
      code: "plugin-manifest-invalid-json",
      summary: "plugin.json のJSON形式が不正です",
    };
  }
  if (lower.includes("plugin-manifest-invalid-schema")) {
    return {
      code: "plugin-manifest-invalid-schema",
      summary: "plugin.json の必須項目が不足しています",
    };
  }
  if (lower.includes("duplicate-plugin-id")) {
    return { code: "duplicate-plugin-id", summary: "同じ plugin id が既に導入されています" };
  }
  if (lower.includes("plugin-entry-load-failed")) {
    return { code: "plugin-entry-load-failed", summary: "プラグインエントリの読み込みに失敗しました" };
  }
  if (
    lower.includes("auth") ||
    lower.includes("authentication") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    return {
      code: "git-auth-failed",
      summary: "認証に失敗しました（private リポジトリの場合は Token を設定してください）",
    };
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return {
      code: "git-not-found-or-private",
      summary: "リポジトリが見つからないか、アクセス権がありません",
    };
  }
  if (
    lower.includes("clone") ||
    lower.includes("repository") ||
    lower.includes("http error")
  ) {
    return { code: "git-clone-failed", summary: "Git クローンに失敗しました" };
  }
  return { code: "unknown", summary: "不明なエラーです（詳細を確認してください）" };
}

function formatErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    const lines = [
      `name: ${error.name}`,
      `message: ${error.message}`,
    ];

    if ("cause" in error && error.cause) {
      lines.push(`cause: ${String(error.cause)}`);
    }
    if (error.stack) {
      lines.push("", "stack:", error.stack);
    }

    return lines.join("\n");
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
