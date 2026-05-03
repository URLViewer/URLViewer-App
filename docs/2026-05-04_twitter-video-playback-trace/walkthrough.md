# 修正内容の確認

## 1. 実再生トレース追加
- `src/electron/services/videoNetworkTrace.ts` を新規追加。
- `onCompleted` / `onErrorOccurred` で得られる URL, method, statusCode, error, headers 等を保持。
- URLはクエリあり/なし両方で引けるよう正規化して保存。

## 2. mainプロセス連携
- `src/electron/main/index.ts`
  - 既存ヘッダ補正フックに加え、`installTwitterVideoTraceHook` を追加。
  - `video.twimg.com` リクエスト結果を上記トレースへ記録。

## 3. IPC / preload / 型の拡張
- `src/shared/types.ts`
  - `VideoPlaybackTrace`, `VideoPlaybackTraceResult` を追加。
- `src/shared/schemas.ts`
  - `playbackTraceLookupSchema` を追加。
- `src/electron/ipc/handlers.ts`
  - `videoSource:getPlaybackTrace` ハンドラを追加。
- `src/electron/preload/index.ts`, `src/web/vite-env.d.ts`
  - `window.m3u8Viewer.videoSource.getPlaybackTrace(url)` を公開。
- `src/web/utils/mockApi.ts`
  - モック実装に `getPlaybackTrace` を追加。

## 4. 再生失敗ログの詳細化
- `src/web/features/player/VideoPlayer.tsx`
  - `enrichPlaybackFailureDetail` で `probe` に加えて `trace` を取得・追記。
  - 例: `trace phase=completed method=GET status=403 ...`

## 5. HTML5再生方式の調整
- `src/web/plugins/builtin/html5PlaybackPlugin.ts`
  - `video.src = ...` から `source` 要素挿入方式に変更。
  - URL拡張子から MIME type を推定し `type="video/mp4"` などを設定。

## 6. 検証
- `yarn typecheck` 実行: 成功。
