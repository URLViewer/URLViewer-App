# 修正内容の確認

## シグネチャ拡張

- `markPlaybackFailed(videoId, reason, detail?)` に変更。
- 対象: `src/web/store/appStoreTypes.ts`

## 詳細情報の付与

- `hlsPlaybackPlugin`:
  - fatal error 時に `type`, `details`, `fatal`, `http`, `response`, `url` を連結した detail を作成。
- `playbackError`:
  - HTMLMediaError の code/message を detail 化。

## ログへの反映

- `VideoPlayer` で `sourceUrl` + failure detail を合成して `markPlaybackFailed` へ渡す。
- `librarySlice` で error ログの `detail` フィールドへ保存。
- これによりログパネルの「詳細を見る」で失敗内訳を閲覧可能。

## 検証

- `yarn typecheck` 成功。
