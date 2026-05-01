# walkthrough

## 1. validationMode の整合
- `pendingValidations` を store に追加。
- `validationMode === "manual"` では即登録せず pending へ追加。
- `validateAllPending()` で並列検証・登録し、失敗分のみ pending に残す。

## 2. plugin timeout / 例外正規化
- timeout は `plugin-timeout`。
- 実行時例外は `plugin-runtime-error`。
- entry不正は `plugin-entry-load-failed`。

## 3. 外部pluginの分離実行
- 外部pluginの `resolveToVideoSources` を worker thread 実行へ変更。
- timeout時は worker terminate で main 側保護。

## 4. 周辺の高優先修正
- `Ctrl/Cmd+W` の web keydown 監視を削除し、preload通知へ一本化。
- E2E を現行URL入力UIへ更新。
- 未使用 `旧入力パネル` / `public/icons.svg` / `public/favicon.svg` を削除。

## 5. 責務分割
- `validationHelpers.ts`: 検証キュー/ pending キュー/URL正規化補助
- `pluginExecution.ts`: plugin実行（timeout/worker/module load）
- `libraryHelpers.ts`: tab/group/video の library 更新純関数
- `registrationWorkflows.ts`: URL登録/手動検証の並列登録パイプライン
- `pluginActions.ts`: plugin一覧更新・有効化・導入の共通処理

## 6. plugin context 拡張
- `src/electron/plugins/types.ts`
  - `InputPluginContext` を追加
  - `context` を `timeZone + nowIso + appVersion` へ拡張
- `src/electron/services/pluginManager.ts`
  - `createPluginContext()` を追加し、builtin/worker 実行へ渡す
- `src/electron/services/pluginExecution.ts`
  - context 引数を受け取り plugin 実行時に利用
- `docs/plugin-development.md`
  - context仕様を更新

## 7. package manager 統一
- `package.json`
  - `packageManager: yarn@4.13.0`
  - `dist` script を `yarn build && electron-builder` に変更
- `playwright.config.ts`
  - webServer command を `yarn dev:web ...` に変更
- `README.md`
  - 各コマンドを `yarn` 記法に更新
- `.yarnrc.yml` を追加（`nodeLinker: node-modules`）
- `yarn.lock` を生成、`pnpm-lock.yaml` を削除
- `@types/aria-query`, `@testing-library/dom` を追加（yarn環境の型整合）

### 分割後の行数
- `appStore.ts`: 34 行
- `slices/uiSlice.ts`: 82 行
- `slices/registrationSlice.ts`: 245 行
- `slices/pluginSlice.ts`: 79 行
- `slices/librarySlice.ts`: 123 行
- `pluginActions.ts`: 94 行
- `registrationWorkflows.ts`: 79 行
- `libraryHelpers.ts`: 204 行
- `validationHelpers.ts`: 129 行
- `pluginManager.ts`: 365 行
- `pluginExecution.ts`: 107 行

## 8. store の最終スライス化
- `src/web/store/appStoreTypes.ts` を新設し、`AppState` / `AppStoreSet` / `AppStoreGet` を共通型として定義。
- `src/web/store/slices/registrationSlice.ts` に URL登録・手動検証系 action を移設。
- `src/web/store/slices/pluginSlice.ts` に plugin 管理 action を移設。
- `src/web/store/slices/librarySlice.ts` に tab/group/video 管理 action を移設。
- `src/web/store/slices/uiSlice.ts` に初期ロード・UI入力・設定保存 action を移設。
- `src/web/store/appStore.ts` は初期 state とスライス compose のみに縮小。

## 9. ESLint 設定の warning 解消
- `eslint.config.js` を削除し、ESM形式の `eslint.config.mjs` に移行。
- `tsconfig.node.json` の include を `eslint.config.mjs` へ更新。
- これにより Node の module type warning が発生しない構成へ整理。

## 10. 検証結果
- `yarn lint`: pass
- `yarn typecheck`: pass
- `yarn test`: pass
- `yarn e2e`: pass

## 11. Core-Plugin 再編（2026-04-30）
- plugin 実行領域を Renderer 側へ移行。
  - 新設: `src/web/plugins/types.ts`
  - 新設: `src/web/plugins/registry.ts`
  - 新設: `src/web/plugins/builtin/hlsPlaybackPlugin.ts`
  - 新設: `src/web/plugins/builtin/html5PlaybackPlugin.ts`
- `runPluginInput` は `plugins:resolveInput` IPC ではなく Renderer registry で実行。
- `VideoPlayer` は再生ロジックを持たず、playback plugin を選択して mount するホストに変更。
- Core の URL登録は m3u8 固定検証を廃止し、URL正規化ベースへ変更。
- plugin/web 向け IPC を拡張。
  - `fs:readTextFile`
  - `fs:writeTextFile`
  - `fs:pickOpenFile`
  - `fs:pickDirectory`
- 特定入力変換プラグインを optional 化して外部へ移設。
  - 追加: `external/plugins/<optional-input-plugin>/index.ts`
  - 追加: `external/plugins/<optional-input-plugin>/plugin.json`
  - 削除: `src/electron/plugins/builtin/<legacy-input-plugin>.ts`

## 12. 追加の検証結果
- `yarn typecheck`: pass
- `yarn lint`: pass
- `yarn test`: pass
- `yarn e2e`: pass

## 13. プラグイン詳細表示改善
- manifest へ次の任意フィールドを追加:
  - `description.summary`
  - `description.detailed`
  - `author`
  - `homepage`
  - `repository`
  - `license`
- Plugin一覧カード右下に `i` バッジを追加し、ホバー時に `description.summary` をツールチップ表示。
- Plugin一覧カード全体をクリックすると詳細ダイアログを開き、manifest 情報と `description.detailed` を表示。
- 内部ボタン（並び替え/ON-OFF/更新/削除）は `stopPropagation` でカードクリックと分離。

## 14. 再生エラー分類と自動除外条件の見直し
- 再生失敗を次の3分類へ統一:
  - `access-error`（コンテンツ取得失敗）
  - `not-playable`（形式非対応/動画でない）
  - `unknown`（不明）
- `PlaybackMountParams.onFatalError` が失敗種別を返すように変更。
- `VideoPlayer` は失敗種別に応じたメッセージ表示へ変更。
- `markPlaybackFailed` は `access-error` の時だけ `removeVideo` を実行し、その他は除外しない。
- `HTML5/HLS` 再生プラグイン側でエラー種別を判定して通知。

## 15. URL登録時のアクセス検証強化
- `videoSource:register` で URL 正規化のみだった処理を変更し、登録前に `validateVideoSourceUrl` を実行。
- `validateVideoSourceUrl` は次の順で到達確認:
  - `HEAD` リクエスト
  - `405/501` の場合は `GET`（`Range: bytes=0-0`）へフォールバック
- タイムアウト/到達不能/非成功ステータスは `reason: "network"` として登録拒否。

## 16. 自動再生のデフォルト停止化
- `VideoPlayer` 内の自動 `video.play()` 呼び出しを削除。
- 起動時・タブオープン時の既定状態は停止（ユーザー操作または再生命令時のみ再生）に変更。

## 17. 検証ボタンからの再検証フロー追加
- ヘッダーの「検証実行」押下時に確認ダイアログを表示。
- `validationMode === "on-register"` かつ pending 0 件の場合:
  - 登録済み動画を対象に全件再検証を実行。
  - キュー表示と結果集計（成功/失敗）を表示。
- 再検証時は `label` を保持して登録APIへ渡し、既存動画の `lastValidatedAt` を更新。

## 18. ライブラリ動画の一括削除
- `LibraryPanel` のヘッダー右側に「全件削除」ボタン（ゴミ箱アイコン）を追加。
- 動画が 0 件のときはボタンを disabled。
- 押下時に確認ダイアログを表示し、確定時に一括削除を実行。
- store に `clearAllVideos` action を追加し、次をまとめて更新:
  - `videos` を空配列化
  - `tabs` を初期化（open/active を空）
  - `groups[].videoIds` を空にクリア

## 19. plugin SDK 化（2026-05-01）
- `packages/plugin-sdk/src/index.ts` を追加し、plugin 公開契約型を集約。
  - `PluginManifestV1`, `PluginPanelSpec`, `RendererPluginDefinition`, `PlaybackFailureKind` など
- TypeScript/Vite の alias に `@m3u8viewer/plugin-sdk` を追加。
- `src/shared/types.ts` は plugin 契約型を SDK から再export する構成へ変更。
- `external/plugins/<optional-input-plugin>/index.ts` の依存を整理。
  - 削除: `@shared/pluginCatalog`, `@shared/<legacy-module>`, `@web/plugins/types`
  - 追加: `@m3u8viewer/plugin-sdk`, `./plugin.json` 直接参照
  - 入力値パース/バリデーションをプラグイン内に内包
- `eslint.config.mjs` に `external/plugins/**/*` 向け `no-restricted-imports` を追加し、`@shared/*`, `@web/*`, `@electron/*` を禁止。

