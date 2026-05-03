# 修正内容の確認

## 1. ビルトインプラグイン化
- `src/shared/pluginCatalog.ts`
  - `builtin.playback.twitter-video-access` を追加。
  - `BUILTIN_PLUGIN_SEEDS` に追加（`sourceRef: "electron"`）。

## 2. 専用モジュールへ分離
- `src/electron/services/builtin/twitterVideoAccessPlugin.ts` を新規追加。
  - プラグイン有効判定: `isTwitterVideoAccessPluginEnabled`
  - ヘッダー生成: `buildTwitterVideoRequestHeaders`

## 3. mainでの適用条件
- `src/electron/main/index.ts`
  - `video.twimg.com` マッチ時のみフック起動（URLフィルタ）。
  - さらにビルトインプラグインがONのときだけヘッダー上書き/トレース記録を実行。
  - OFF時は元ヘッダーをそのまま通す。

## 4. 影響範囲
- 他ドメインの動画URLには一切適用されない（`urls: ["https://video.twimg.com/*"]`）。

## 5. 検証
- `yarn typecheck` 成功。
