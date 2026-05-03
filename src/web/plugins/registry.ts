import type { PluginListItem } from "@shared/types";
import { html5PlaybackPlugin } from "@web/plugins/builtin/html5PlaybackPlugin";
import { hlsPlaybackPlugin } from "@web/plugins/builtin/hlsPlaybackPlugin";
import { twitterVideoAccessPlaybackPlugin } from "@web/plugins/builtin/twitterVideoAccessPlaybackPlugin";
import type {
  RendererPlaybackPlugin,
  RendererPluginDefinition,
  RendererPluginRuntime,
} from "@web/plugins/types";

const rendererPlugins: RendererPluginDefinition[] = [
  twitterVideoAccessPlaybackPlugin,
  hlsPlaybackPlugin,
  html5PlaybackPlugin,
];

const runtimeById = new Map<string, RendererPluginRuntime>(
  rendererPlugins.map((plugin) => [plugin.id, plugin.runtime]),
);

const TWITTER_ACCESS_PLUGIN_ID = "builtin.playback.twitter-video-access";

function isTwitterVideoUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === "video.twimg.com";
  } catch {
    return false;
  }
}

export function resolvePlaybackPlugin(
  sourceUrl: string,
  enabledPlugins: PluginListItem[],
): RendererPlaybackPlugin | null {
  const ordered = [...enabledPlugins].sort((a, b) => a.order - b.order);

  if (isTwitterVideoUrl(sourceUrl)) {
    const twitterAccessPlugin = ordered.find(
      (plugin) =>
        plugin.id === TWITTER_ACCESS_PLUGIN_ID &&
        plugin.enabled &&
        plugin.manifest.capabilities.includes("playback"),
    );
    if (twitterAccessPlugin) {
      const playback = runtimeById.get(twitterAccessPlugin.id)?.playback;
      if (playback && playback.canHandle(sourceUrl)) {
        return playback;
      }
    }
  }

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
