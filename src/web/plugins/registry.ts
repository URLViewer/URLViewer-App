import type { PluginListItem } from "@shared/types";
import { html5PlaybackPlugin } from "@web/plugins/builtin/html5PlaybackPlugin";
import { hlsPlaybackPlugin } from "@web/plugins/builtin/hlsPlaybackPlugin";
import type {
  RendererPlaybackPlugin,
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
