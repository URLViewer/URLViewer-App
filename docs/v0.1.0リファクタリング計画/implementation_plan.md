# implementation_plan

## 実装方針
1. `manual` モードでは URL を即登録せず、検証待ちキューへ蓄積する。
2. 「検証実行」でキューを並列検証・登録し、失敗分のみ再待機させる。
3. plugin実行は timeout で打ち切り、エラーコードを正規化する。
4. 外部pluginは worker thread 上で実行し、main process から分離する。
5. 競合ショートカット・陳腐化ファイル・古いE2Eを整理する。
6. 巨大ファイルを責務単位に分割する。
7. plugin context を拡張し、Core情報を plugin へ提供する。
8. package manager を yarn に統一する。
9. plugin実行を renderer 側へ移し、Core-Plugin 境界を再定義する。
10. 再生機能を playback plugin として分離し、Core を URL登録中心へ寄せる。
11. plugin/web から使う IPC を拡充する。
12. 特定入力変換プラグインを optional external plugin へ移設する。

## 実施ログ
- 2026-04-29: manualモード用 pending queue 実装
- 2026-04-29: plugin timeout / runtime error 正規化
- 2026-04-29: 外部plugin worker実行導入
- 2026-04-29: Ctrl/Cmd+W 二重処理解消
- 2026-04-29: 未使用ファイル削除と E2E 更新
- 2026-04-30: `validationHelpers.ts` 新設（検証キュー責務を抽出）
- 2026-04-30: `pluginExecution.ts` 新設（plugin実行責務を抽出）
- 2026-04-30: `libraryHelpers.ts` 新設（library 更新責務を抽出）
- 2026-04-30: `registrationWorkflows.ts` 新設（登録実行パイプライン共通化）
- 2026-04-30: `pluginActions.ts` 新設（plugin 操作の状態更新共通化）
- 2026-04-30: plugin context を `timeZone + nowIso + appVersion` に拡張
- 2026-04-30: `packageManager` を yarn へ変更、`yarn.lock` 生成、`pnpm-lock.yaml` 削除
- 2026-04-30: Zustand store を `ui / registration / plugin / library` スライスへ最終分割
- 2026-04-30: `eslint.config.js` を廃止し `eslint.config.mjs` へ移行
- 2026-04-30: Renderer plugin 基盤を `src/web/plugins` に新設（input / playback）
- 2026-04-30: `VideoPlayer` を playback plugin ホスト化（HLS直書きロジック除去）
- 2026-04-30: `videoSource` 登録を m3u8 固定検証から URL登録へ変更
- 2026-04-30: IPC に `fs:readTextFile`, `fs:writeTextFile`, `fs:pickOpenFile`, `fs:pickDirectory` を追加
- 2026-04-30: 特定入力変換プラグインを `external/plugins` へ移設し optional 化
- 2026-04-30: plugin manifest に `description.summary/detailed`, `author`, `homepage`, `repository`, `license` を追加
- 2026-04-30: PluginManager 一覧へ `i`ホバー説明と詳細ダイアログ表示を追加
- 2026-04-30: 再生エラーを `access-error / not-playable / unknown` へ分類し、`access-error` のみ自動除外に変更
- 2026-04-30: URL登録時に到達確認（HEAD + GET fallback）を導入し、到達不能URLを登録拒否
- 2026-04-30: `VideoPlayer` の自動 `play()` を廃止し、起動時/タブオープン時の既定を停止へ変更
- 2026-04-30: 検証ボタン押下時に確認ダイアログを追加し、on-register モードで全登録URLの再検証を実行可能化
- 2026-04-30: Libraryパネルに「全件削除」導線を追加し、動画一括削除を実装
- 2026-05-01: `packages/plugin-sdk` を追加し、plugin manifest/runtime 契約型をSDKへ移設
- 2026-05-01: `external/plugins/<optional-input-plugin>` の内部依存を排除（`@shared/*` / `@web/*` を除去）
- 2026-05-01: 外部プラグインの manifest 参照を `plugin.json` 起点へ変更
- 2026-05-01: `external/plugins/**/*` に `no-restricted-imports` を追加して内部importを禁止

## 検証
- `yarn lint` pass
- `yarn typecheck` pass
- `yarn test` pass
- `yarn e2e` pass

