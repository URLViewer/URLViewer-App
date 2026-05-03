# 修正内容の確認

## 1) バリデーション詳細の拡張

- `src/electron/services/videoSourceResolver.ts`
  - HEAD/GET プローブ結果に基づき、`status=403` や `timeout(...)` などの detail 文字列を返すように変更。
- `src/shared/types.ts`
  - `VideoSourceValidateResult.invalid.detail?: string`
  - `RegisterVideoSourceResult.rejected.detail?: string`
- `src/electron/ipc/handlers.ts`
  - register rejected 時に `detail` を返却。

## 2) 再生失敗ログの補強

- `src/web/features/player/VideoPlayer.tsx`
  - fatal playback failure 時に `videoSource.validate` を短時間再実行し、`probe reason=... detail=...` を追記。
  - 既存の `source=...` / plugin由来detail と結合して `markPlaybackFailed` に渡す。
- `src/web/store/slices/librarySlice.ts`
  - `markPlaybackFailed(videoId, reason, detail?)` で `appendLog` の `detail` に保存。

## 3) 登録失敗詳細フォーマット改善

- `src/web/store/registrationWorkflows.ts`
  - `FailedRegistrationJob` に `detail?: string` を保持。
- `src/web/store/slices/registrationSlice.ts`
  - 失敗一覧 detail に `detail:` 行を追加。

## 検証

- `yarn typecheck` 成功。
