import { BUILTIN_HTML5_PLAYBACK_MANIFEST } from "@shared/pluginCatalog";
import { classifyHtmlMediaError } from "@web/plugins/playbackError";
import type { RendererPluginDefinition } from "@web/plugins/types";

function isM3u8Url(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

export const html5PlaybackPlugin: RendererPluginDefinition = {
  id: BUILTIN_HTML5_PLAYBACK_MANIFEST.id,
  manifest: BUILTIN_HTML5_PLAYBACK_MANIFEST,
  runtime: {
    playback: {
      canHandle: (sourceUrl) => !isM3u8Url(sourceUrl),
      mount: ({ video, sourceUrl, onFatalError }) => {
        const onError = () => onFatalError(classifyHtmlMediaError(video.error));
        video.addEventListener("error", onError);
        video.src = sourceUrl;
        return () => {
          video.removeEventListener("error", onError);
          video.removeAttribute("src");
          video.load();
        };
      },
    },
  },
};
