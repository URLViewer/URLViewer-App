# 実装計画（詳細版）

## 1. 設計方針

### 1.1 なぜ Core を URL中心へ変えたか
- 入力ソースを特定形式へ固定にすると、拡張時に常に Core を触る必要が出る。
- URL登録を Core に寄せると、入力ロジックの差分は Plugin で吸収できる。
- 責務を「入力変換（Plugin）」と「検証登録（Core）」で分離できる。

### 1.2 Plugin Contract v1
- マニフェストは `plugin.json` 固定。
- `apiVersion = "1.0.0"` で互換を判定。
- `capabilities = ["input-panel"]` のみ許可。
- プラグインが返すのは URL候補配列のみ。再生UIやアプリ本体状態への直接介入は不可。

## 2. ドメイン/データモデル計画

### 2.1 旧モデルから新モデル
- 旧: 旧入力識別子ベースの状態管理
- 新: `id`, `sourceUrl`, `openVideoIds`, `activeVideoId`, `group.videoIds`

### 2.2 設定モデル
- `validationMode`: `on-register | manual`
- `validationConcurrency`: 数値
- `validationTimeoutMs`: 数値
- `restoreTabsOnLaunch`: 真偽値

### 2.3 永続化移行
- `dataVersion=2` を導入。
- 旧データは互換変換せずリセット（合意済み方針）。

## 3. Electron層実装計画

### 3.1 video source resolver
- 入力URLの妥当性チェック。
- レスポンス到達性と `#EXTM3U` 判定。
- MIMEの許容判定。
- timeout 付き fetch。

### 3.2 plugin manager
- 一覧取得。
- 有効/無効切替。
- 並び替え。
- ローカル導入（zip/folder）。
- Git導入/更新。
- 削除。
- パネル情報取得。
- 入力実行（`resolveInput`）。

### 3.3 IPC再編
- `videoSource:*`
- `plugins:*`
- `settings:*`
- `library:*`
- `player:*`

## 4. Renderer層実装計画

### 4.1 状態管理
- `library`, `settings`, `plugins`, `validationQueue`, `playback` を Zustand で統合。
- URL一括登録と並列検証を `runWithConcurrency` で実行。

### 4.2 UI構成
- 入力パネル: Core URL入力 + 有効プラグイン入力パネル群。
- プラグイン管理: 導入系と一覧系を分離（理解コスト低減）。
- 既存パネル（ライブラリ/グループ/タブ/プレイヤー）は新ID基準に統一。

## 5. 実装中に出た問題と対処戦略

### 5.1 ESM/CJS境界問題
- 症状: preload/main の読み込み失敗、`require` 非定義、named export 不一致。
- 対処:
  - preload を `index.cjs` 固定。
  - main 出力の拡張子/実行方式を調整。
  - 依存ライブラリの static import を避け、必要箇所を遅延ロード。

### 5.2 `keytar` / `isomorphic-git` バンドル問題
- 症状: `../build/Release/keytar.node` 未解決、`require("fs")` 実行時エラー。
- 対処:
  - 遅延 `require` ベースに変更。
  - runtime で unavailable の場合に失敗を局所化。

### 5.3 環境変数影響
- 症状: `electron.app` が `undefined`。
- 原因: `ELECTRON_RUN_AS_NODE=1` が環境に残存。
- 対処: dev スクリプトで未設定化して起動。

## 6. テスト計画と実施
- 型安全: `pnpm typecheck`
- 静的品質: `pnpm lint`
- 単体: `pnpm test`
- 出力検証: `pnpm build`

## 7. 実装後の残課題（軽微）
- Vite/Rolldown 警告（alias deprecation / chunk size / inlineDynamicImports）は継続。
- 現時点で機能動作には影響しないが、次フェーズでビルド設定を整理する余地あり。
