# 修正内容の確認

## 必要だった修正（維持）
- `src/electron/main/index.ts`
  - `video.twimg.com` 宛の `Referer/Origin/Accept/User-Agent` 強制上書き。
  - これが 403 回避に直接必要。
- `src/electron/services/videoNetworkTrace.ts` と関連IPC（handlers/preload/types/schemas/vite-env/mockApi）
  - 再生失敗時に HTTPステータス等を詳細ログ化するために必要。
- `src/web/features/player/VideoPlayer.tsx`
  - 再生失敗 detail に `probe` + `trace` を追加する処理。

## 不要だった改変（巻き戻し済み）
- `src/web/plugins/builtin/html5PlaybackPlugin.ts`
  - `<video src=...>` から `<source type=...>` へ変更していたが、403原因解消には不要。
  - 元の `video.src = sourceUrl` に戻した。
- `src/electron/services/videoSourceResolver.ts`
  - Twitter専用ヘッダー付与 + GET Range優先プローブは、再生403の本質対策ではなく過剰。
  - 汎用HEAD中心の検証ロジックへ戻した（detail返却は維持）。

## 検証
- `yarn typecheck` 成功。
