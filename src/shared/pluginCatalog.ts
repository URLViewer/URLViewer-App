import type { PluginListItem, PluginManifestV1 } from "@shared/types";

export const BUILTIN_HTML5_PLAYBACK_MANIFEST: PluginManifestV1 = {
  id: "builtin.playback.html5",
  name: "HTML5 Video Playback",
  version: "1.0.0",
  apiVersion: "1.0.0",
  entry: "__renderer__/builtin/html5-playback",
  capabilities: ["playback"],
  description: {
    summary: "video要素で再生可能なURLを再生します。",
    detailed:
      "ブラウザの標準 video 再生機能で扱える URL を再生します。m3u8 以外の一般的な動画URLの再生に利用されます。",
  },
  author: { name: "M3u8Viewer Team" },
  license: "MIT",
};

export const BUILTIN_HLS_PLAYBACK_MANIFEST: PluginManifestV1 = {
  id: "builtin.playback.hls",
  name: "HLS Playback",
  version: "1.0.0",
  apiVersion: "1.0.0",
  entry: "__renderer__/builtin/hls-playback",
  capabilities: ["playback"],
  description: {
    summary: "m3u8 URL を再生します。",
    detailed:
      "HLS.js を使って m3u8 ストリームを再生します。URL が .m3u8 の場合に優先して利用されます。",
  },
  author: { name: "M3u8Viewer Team" },
  license: "MIT",
};

export const BUILTIN_TWITTER_VIDEO_ACCESS_MANIFEST: PluginManifestV1 = {
  id: "builtin.playback.twitter-video-access",
  name: "Twitter Video Access",
  version: "1.0.0",
  apiVersion: "1.0.0",
  entry: "__renderer__/builtin/twitter-video-access",
  capabilities: ["playback"],
  description: {
    summary: "video.twimg.com 向けのアクセスヘッダー補正を行います。",
    detailed:
      "X/Twitter動画CDN(video.twimg.com)で再生時に403を回避するため、Referer/Origin/Accept/User-Agent/Rangeを補正します。対象は video.twimg.com のみです。",
  },
  author: { name: "M3u8Viewer Team" },
  license: "MIT",
};

export const BUILTIN_PLUGIN_SEEDS: PluginListItem[] = [
  {
    id: BUILTIN_TWITTER_VIDEO_ACCESS_MANIFEST.id,
    enabled: true,
    order: 0,
    sourceType: "builtin",
    sourceRef: "renderer",
    manifest: BUILTIN_TWITTER_VIDEO_ACCESS_MANIFEST,
  },
  {
    id: BUILTIN_HTML5_PLAYBACK_MANIFEST.id,
    enabled: true,
    order: 1,
    sourceType: "builtin",
    sourceRef: "renderer",
    manifest: BUILTIN_HTML5_PLAYBACK_MANIFEST,
  },
  {
    id: BUILTIN_HLS_PLAYBACK_MANIFEST.id,
    enabled: true,
    order: 2,
    sourceType: "builtin",
    sourceRef: "renderer",
    manifest: BUILTIN_HLS_PLAYBACK_MANIFEST,
  },
];
