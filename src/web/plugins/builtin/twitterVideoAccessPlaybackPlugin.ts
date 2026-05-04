import { BUILTIN_TWITTER_VIDEO_ACCESS_MANIFEST } from "@shared/pluginCatalog";
import { classifyHtmlMediaError } from "@web/plugins/playbackError";
import type { RendererPluginDefinition } from "@web/plugins/types";

const POLICY_ID = "builtin.twitter-video-access.policy";
const TWITTER_VIDEO_HOST = "video.twimg.com";

function isTwitterVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === TWITTER_VIDEO_HOST;
  } catch {
    return false;
  }
}

export const twitterVideoAccessPlaybackPlugin: RendererPluginDefinition = {
  id: BUILTIN_TWITTER_VIDEO_ACCESS_MANIFEST.id,
  manifest: BUILTIN_TWITTER_VIDEO_ACCESS_MANIFEST,
  runtime: {
    playback: {
      canHandle: (sourceUrl) => isTwitterVideoUrl(sourceUrl),
      mount: ({ video, sourceUrl, onFatalError }) => {
        let disposed = false;
        let acquired = false;
        let released = false;

        const releasePolicy = () => {
          if (released || !acquired) {
            return;
          }
          released = true;
          void window.m3u8Viewer.network.releaseHeaderOverride(POLICY_ID);
        };

        const onError = () => onFatalError(classifyHtmlMediaError(video.error));
        video.addEventListener("error", onError);

        void (async () => {
          try {
            await window.m3u8Viewer.network.acquireHeaderOverride({
              id: POLICY_ID,
              hosts: [TWITTER_VIDEO_HOST],
              headers: {
                referer: "https://x.com/",
                origin: "https://x.com",
                accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
                "user-agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              },
              preserveRange: false,
            });
            acquired = true;
          } catch (error) {
            void error;
            onFatalError({ kind: "access-error" });
            return;
          }

          if (disposed) {
            releasePolicy();
            return;
          }

          video.src = sourceUrl;
        })();

        return () => {
          disposed = true;
          video.removeEventListener("error", onError);
          releasePolicy();
          video.removeAttribute("src");
          video.load();
        };
      },
    },
  },
};
