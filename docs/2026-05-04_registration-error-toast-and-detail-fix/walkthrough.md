# 修正内容の確認

## 1) エラートーストが出ない問題

- `src/web/App.tsx` に `logCursorInitializedRef` を追加し、ログカーソル初期化フェーズと通常監視フェーズを分離。
- 初期化後は `previousLogId === null` の場合でも新規ログを通知対象として扱うように変更。
- これにより、起動後最初のエラーログでもトースト表示される。

## 2) 失敗詳細がログに出ない問題

- `src/web/store/registrationWorkflows.ts` で `FailedRegistrationJob` 型を追加し、`failedJobs` に `reason`（`invalid-url` / `network`）を保持。
- `src/web/store/slices/registrationSlice.ts` で失敗時ログに `detail` を付与。
  - 対象: URL登録 / プラグイン登録 / 再検証 / 検証待ち実行
- `detail` には失敗URL一覧と reason を行単位で出力。

## 3) 検証

- `yarn typecheck` 成功。
