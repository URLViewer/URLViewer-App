# task

## 目的
優先度順にリファクタリングを進め、設計不整合と運用リスクを低減する。

## 実施対象（優先順）
1. validationMode の実装整合（manual モード実体化）
2. plugin実行の timeout / 例外正規化
3. 外部plugin実行の分離（main process 影響の隔離）
4. 高優先の周辺修正（ショートカット二重処理、未使用物整理、E2E更新）
5. 責務分割（store / manager の分離）
6. store ライブラリ操作ロジックの分割（tab/group/video 更新）
7. registration ワークフロー分割（URL登録/検証実行の共通化）
8. plugin action 分割（一覧更新/有効化/導入系の共通化）
9. plugin context 拡張（timeZone 以外）
10. package manager 方針統一（pnpm / yarn）

## 実施結果
- [x] 1. validationMode 整合
- [x] 2. plugin timeout / 例外正規化
- [x] 3. 外部pluginの worker thread 分離実行
- [x] 4. 周辺修正（Ctrl/Cmd+W 二重処理解消、未使用ファイル削除、E2E更新）
- [x] 5. 責務分割（`validationHelpers.ts` / `pluginExecution.ts` 抽出）
- [x] 6. store ライブラリ操作分割（`libraryHelpers.ts` 抽出）
- [x] 7. registration 分割（`registrationWorkflows.ts` 抽出）
- [x] 8. plugin action 分割（`pluginActions.ts` 抽出）
- [x] 9. plugin context 拡張（`nowIso` / `appVersion`）
- [x] 10. package manager を yarn に統一（`yarn.lock` / `.yarnrc.yml`）

## 継続タスク
- [x] Zustand store の最終スライス化（`registration/plugin/library/ui` の create関数分割）
- [x] `eslint.config.js` の module type warning 解消（`eslint.config.mjs` へ移行）

## 追加タスク（2026-04-30）
- [x] plugin 実行領域を Renderer (`src/web/plugins`) へ移行
- [x] Core から m3u8 固定再生責務を除去し、playback plugin 化
- [x] Core 主機能を「URL登録」に統一（m3u8 固定バリデーション除去）
- [x] plugin/web 用 IPC 基盤を拡張（`fs:read/write/pick`）
- [x] 特定入力変換プラグインを optional 化し `external/plugins` へ移設
- [x] Plugin manifest を拡張（short/detail説明、author 等の詳細メタデータ）
- [x] プラグイン一覧UIを強化（`i`ホバーツールチップ、カードクリック詳細ダイアログ）
- [x] 再生エラーを3分類し、アクセスエラー時のみ自動除外する挙動へ変更
- [x] URL登録時のアクセス可否検証を強化（到達不能URLのすり抜け防止）
- [x] 起動時/タブオープン時の自動再生を停止（デフォルト停止）
- [x] 検証ボタンで確認ダイアログを表示し、on-register時の再検証を実行可能化
- [x] ライブラリ動画の一括削除ボタンを追加（確認ダイアログ付き）

## 追加タスク（2026-05-01）
- [x] `@m3u8viewer/plugin-sdk` を新設し、plugin契約型をSDKへ分離
- [x] external plugin (`オプショナル入力プラグイン`) の `@shared/*` / `@web/*` 依存を除去
- [x] external plugin の manifest 参照をローカル `plugin.json` 起点へ変更
- [x] external plugin に対する内部import禁止ルール（ESLint）を追加

