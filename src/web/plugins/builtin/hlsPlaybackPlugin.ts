import Hls from "hls.js";
import { BUILTIN_HLS_PLAYBACK_MANIFEST } from "@shared/pluginCatalog";
import { classifyHtmlMediaError } from "@web/plugins/playbackError";
import type { PlaybackFailure, RendererPluginDefinition } from "@web/plugins/types";

function isM3u8Url(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

export const hlsPlaybackPlugin: RendererPluginDefinition = {
  id: BUILTIN_HLS_PLAYBACK_MANIFEST.id,
  manifest: BUILTIN_HLS_PLAYBACK_MANIFEST,
  runtime: {
    playback: {
      canHandle: (sourceUrl) => isM3u8Url(sourceUrl),
      mount: ({ video, sourceUrl, onFatalError }) => {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              const detail = [
                `type=${data.type}`,
                `details=${data.details}`,
                `fatal=${String(data.fatal)}`,
                data.response?.code ? `http=${data.response.code}` : "",
                data.response?.text ? `response=${data.response.text}` : "",
                data.url ? `url=${data.url}` : "",
              ]
                .filter(Boolean)
                .join(" ");
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                onFatalError(withFailureDetail("access-error", detail));
                return;
              }
              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                onFatalError(withFailureDetail("not-playable", detail));
                return;
              }
              onFatalError(withFailureDetail("unknown", detail));
            }
          });
          hls.attachMedia(video);
          hls.loadSource(sourceUrl);
          return () => hls.destroy();
        }

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

function withFailureDetail(
  kind: "access-error" | "not-playable" | "unknown",
  detail: string,
): PlaybackFailure {
  return {
    kind,
    detail,
  } as PlaybackFailure;
}
