import type { PluginListItem } from "@shared/types";
import { html5PlaybackPlugin } from "@web/plugins/builtin/html5PlaybackPlugin";
import { hlsPlaybackPlugin } from "@web/plugins/builtin/hlsPlaybackPlugin";
import type {
  RendererPlaybackPlugin,
  RendererPluginContext,
  RendererPluginDefinition,
  RendererPluginRuntime,
} from "@web/plugins/types";

const rendererPlugins: RendererPluginDefinition[] = [
  hlsPlaybackPlugin,
  html5PlaybackPlugin,
];

const runtimeById = new Map<string, RendererPluginRuntime>(
  rendererPlugins.map((plugin) => [plugin.id, plugin.runtime]),
);

function createContext(): RendererPluginContext {
  return {
    timeZone: "Asia/Tokyo",
    nowIso: new Date().toISOString(),
    appVersion: "renderer",
  };
}

export function resolveInputPanelPlugins(plugins: PluginListItem[]): PluginListItem[] {
  return plugins
    .filter((item) => item.enabled && item.manifest.capabilities.includes("input-panel"))
    .filter((item) => Boolean(runtimeById.get(item.id)?.input))
    .map((item) => {
      const runtime = runtimeById.get(item.id);
      return {
        ...item,
        panel: runtime?.input?.panel ?? item.panel,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export async function runRendererInputPlugin(
  pluginId: string,
  input: string,
  timeoutMs: number,
): Promise<string[]> {
  const runtime = runtimeById.get(pluginId)?.input;
  if (!runtime) {
    throw new Error("plugin-entry-load-failed");
  }

  const boundedTimeoutMs = Math.max(1000, timeoutMs);
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("plugin-timeout")), boundedTimeoutMs);
  });

  try {
    const resolved = Promise.resolve(runtime.resolveToVideoSources(input, createContext()));
    const urls = await Promise.race([resolved, timeoutPromise]);
    return [...new Set((Array.isArray(urls) ? urls : []).filter((entry) => typeof entry === "string"))];
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export function resolvePlaybackPlugin(
  sourceUrl: string,
  enabledPlugins: PluginListItem[],
): RendererPlaybackPlugin | null {
  const ordered = [...enabledPlugins].sort((a, b) => a.order - b.order);
  for (const plugin of ordered) {
    if (!plugin.enabled || !plugin.manifest.capabilities.includes("playback")) {
      continue;
    }

    const playback = runtimeById.get(plugin.id)?.playback;
    if (!playback) {
      continue;
    }
    if (playback.canHandle(sourceUrl)) {
      return playback;
    }
  }

  return null;
}
