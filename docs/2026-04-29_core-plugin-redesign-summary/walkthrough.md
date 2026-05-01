# 修正内容の確認（Walkthrough・詳細版）

## 1. 全体サマリー
今回の変更は「機能追加」ではなく、アプリの主語を入れ替える再設計。

- 変更前: 特定入力形式を中心に動画を扱うアプリ
- 変更後: `.m3u8 URL` を登録して扱うアプリ
- 入力変換は本体機能ではなく、入力プラグインへ移動

この分離により、将来「別入力形式」を追加する場合に Core 改修が不要な構造へ移行した。

## 2. 実装の流れ

### フェーズ1: 契約定義と型置換
- `src/shared/types.ts` と `src/shared/schemas.ts` を全面更新。
- UI/Electron どちらもこの契約へ合わせる前提を確立。

### フェーズ2: Core URL登録の確立
- `videoSourceResolver` を追加。
- URL形式判定、到達性判定、m3u8シグネチャ判定を実装。
- `videoSource:register` で重複URL回避と動画登録を実装。

### フェーズ3: Plugin基盤の追加
- `pluginManager` を新設。
- list/enable/reorder/remove/install/update/resolveInput を実装。
- 入力変換プラグインを plugin 化。

### フェーズ4: Renderer全面移行
- Zustand ストアを新モデルへ置換。
- 旧入力識別子依存コンポーネントを `videoId` 基準へ更新。
- 入力パネルを Core URL + Plugin入力へ再構築。

### フェーズ5: UI修正と運用性改善
- プラグイン管理画面の表示崩れ修正。
- 「導入」と「一覧」を分離して情報設計を改善。
- 再読込アイコンを専用品へ差し替え。

### フェーズ6: 不具合対応
- preload/main のモジュール読込不整合修正。
- `keytar` と `isomorphic-git` のバンドル実行時エラー回避。
- `ELECTRON_RUN_AS_NODE` の影響を dev 起動で吸収。

## 3. 変更点の詳細（領域別）

### 3.1 Shared
- `validationMode` を新定義へ変更。
- group 制約（1〜10文字）を schema に反映。
- Plugin manifest/panel/install payload の zod 契約を追加。

### 3.2 Electron
- `AppStoreService` にデータバージョン管理追加。
- 旧入力変換ロジックを Core から分離（Core 非依存化）。
- plugin manager で zip/folder/git 導入を提供。
- keychain 管理を追加（token 平文保持回避）。

### 3.3 Web
- App shell から旧入力専用導線を除去。
- `InputPanel` 新設（Core + Plugin）。
- `PluginManagerPanel` 新設・再改修（導入/一覧分離）。
- `VideoPlayer` の再生制御を `videoId` 基準へ統一。

### 3.4 Docs
- `requirements.md` を Core+Plugin 仕様へ書き換え。
- `plugin-development.md` を新規作成。
- 本詳細サマリーを追加。

## 4. 重要な不具合と解決内容

### 4.1 `require is not defined` / preload load failure
- 原因: preload の出力形式不整合。
- 解決: preload を `.cjs` で固定。

### 4.2 `keytar.node` 未解決
- 原因: ネイティブモジュールを静的に束ねようとして失敗。
- 解決: runtime 遅延ロードへ変更。

### 4.3 `require("fs")` 実行時エラー
- 原因: `isomorphic-git` が ESM バンドル境界で CJS require を引いた。
- 解決: plugin manager 内で git/http を遅延 require。

### 4.4 `electron.app` が undefined
- 原因: 実行環境に `ELECTRON_RUN_AS_NODE=1` が設定。
- 解決: dev スクリプトで変数を未設定化して起動。

### 4.5 プラグイン管理UI崩れ
- 原因: 固定サイズアイコンボタンにテキストを乗せた設計ミス。
- 解決: 専用アクションボタンへ置換し、導入/一覧を分離。

## 5. 検証結果
- `pnpm typecheck`: pass
- `pnpm lint`: pass
- `pnpm test`: pass
- `pnpm build`: pass

補足:
- Vite/Rolldown の警告は出るが、現時点で機能動作へのブロッカーではない。

## 6. 追加成果（運用/保守）
- プラグイン開発者向けガイドを整備し、第三者実装の導線を確保。
- 仕様がドキュメント化されたため、以後の plugin 実装レビュー基準が明確化。

## 7. 今後の推奨作業
- build警告の整理（alias / inlineDynamicImports / chunk分割）。
- plugin 実行失敗時のUIメッセージをより具体化。
- plugin 署名・信頼設定（将来要件）。
