# タスクリスト（詳細版）

## 0. 背景
- 既存アプリは特定入力形式を中心に据えた設計で、URL直接登録や将来の入力拡張に対して密結合だった。
- 今回はアプリの核を URL ベースに再定義し、入力変換機能は「入力プラグイン」へ分離することが目的。

## 1. ゴール
- Core を `.m3u8 URL入力 -> 検証 -> 動画登録` に統一。
- 入力変換機能を Core から分離し、プラグイン化。
- プラグイン管理機能（導入/有効化/順序/更新/削除）を実装。
- 旧データ形式の互換保持はせず、データバージョン判定で初回リセット。
- 既存UIの機能を維持しつつ、新モデルへ移行。

## 2. タスク分解と実施結果

### A. ドメイン再定義
- [x] `VideoItem` を URL中心へ変更（`id`, `label`, `sourceUrl`, `resumeSeconds`, `addedByPluginId`）。
- [x] タブ状態を `openVideoIds` / `activeVideoId` に変更。
- [x] グループ紐付けを `videoIds` 配列に統一。
- [x] `validationMode` を `on-register | manual` に整理。

### B. スキーマ/デフォルト/永続化
- [x] `zod` スキーマを新型へ更新。
- [x] `DEFAULT_LIBRARY`, `DEFAULT_SETTINGS`, `DEFAULT_PLUGIN_STATE` を更新。
- [x] `AppStoreService` に `dataVersion=2` 判定を追加。
- [x] 旧データ検知時に `library/plugins` リセットを実装。

### C. Core URL登録機能
- [x] `.m3u8` 判定ロジック（拡張子、レスポンス、`#EXTM3U` シグネチャ）を実装。
- [x] `videoSource:validate` / `videoSource:register` IPC を新設。
- [x] 重複URLの登録防止（既存 `sourceUrl` との重複チェック）。
- [x] 生存URLエクスポート機能を `video.sourceUrl` ベースに更新。

### D. Pluginホスト
- [x] Plugin Contract v1 に沿って `plugin.json` 検証を実装。
- [x] `plugins:list/panels/enable/reorder/remove/update` を実装。
- [x] `plugins:installFromZip/installFromFolder/installFromGit` を実装。
- [x] private Git token を keychain（keytar）保存に対応。
- [x] 入力変換プラグインを plugin 形式へ移植。

### E. Renderer移行
- [x] Zustand ストアを新契約で再構成。
- [x] `InputPanel` を Core URL + Plugin入力の並列表示へ変更。
- [x] `PluginManagerPanel` を追加。
- [x] `VideoPlayer`/`LibraryPanel`/`GroupPanel`/`VideoTabs`/`Queue`/`Settings` を `videoId` 基準へ移行。

### F. UI改修（追加要求分）
- [x] プラグイン管理画面を「導入」「一覧」で分離。
- [x] 文字潰れ要因（固定幅アイコンボタン流用）を専用ボタンへ置換。
- [x] 再読込を専用 `refresh` アイコンへ変更。

### G. 不具合対応
- [x] preload 読み込み不整合（ESM/CJS）対応。
- [x] `keytar` / `isomorphic-git` のバンドル時依存解決エラー回避（遅延 require 化）。
- [x] `electron-store` 初期化での runtime エラー回避。
- [x] `ELECTRON_RUN_AS_NODE` が有効な環境に対応（dev script で未設定化）。

### H. ドキュメント
- [x] `docs/requirements.md` を Core+Plugin 構成へ全面更新。
- [x] `docs/plugin-development.md` を新規作成（開発者向け）。
- [x] 本サマリー（task/plan/walkthrough）作成。

## 3. 検証コマンド
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm build`

## 4. 成果物一覧
- 機能: Core URL登録、Pluginホスト、Plugin管理UI、入力変換プラグイン。
- 品質: 型チェック/静的解析/単体テスト/ビルドの完走。
- 文書: 要件定義更新、プラグイン開発ガイド、今回の詳細サマリー。
