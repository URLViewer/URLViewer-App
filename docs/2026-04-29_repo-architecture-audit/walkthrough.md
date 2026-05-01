# 修正内容の確認（Walkthrough）

## 1. 評価結果

### 1-1. 未使用ファイル/ディレクトリ/ライブラリ
- 未使用ファイル候補:
  - `src/web/features/legacy-input/LegacyInputPanel.tsx`（参照元なし）
  - `public/icons.svg`（参照元なし）
  - `public/favicon.svg`（`index.html` から未参照）
- 陳腐化テスト:
  - `test/e2e/app.spec.ts` が旧 UI 前提（旧タイトル・旧入力導線）
  - 現行 UI は `M3U8 ビューア` と `URL入力 (.m3u8)` 中心
- 未使用依存候補（要最終検証）:
  - `@testing-library/react`, `@testing-library/user-event` は現状テストで未使用

### 1-2. アーキテクチャ可読性/保守性
- 良い点:
  - `src/electron`, `src/web`, `src/shared` でレイヤ分離
  - preload 経由で Renderer から Electron API を限定公開
- 改善余地:
  - `src/web/store/appStore.ts` が約 590 行で責務過多
  - `src/electron/services/pluginManager.ts` が約 341 行で責務過多
  - IPC ハンドラも単一ファイル集中

### 1-3. Core-Plugin の責任分離
- 良い点:
  - plugin は `resolveToVideoSources` で URL 候補を返すのみ
  - 検証/登録は Core 側で実施
- 問題点:
  - `resolveInput` で `timeoutMs` が未使用（`void timeoutMs`）
  - plugin 実行例外の吸収が弱く、失敗の局所化が不十分
  - plugin は main process 内で動作し、分離実行ではない

### 1-4. プラグイン開発容易性
- 良い点:
  - `docs/plugin-development.md` が整備済み
  - zip/folder/git 導入、git update、token 保持まで実装
- 改善余地:
  - 開発者向け scaffold/テンプレート生成がない
  - Contract が `apiVersion: "1.0.0"` 固定で将来拡張余地が狭い

### 1-5. Core API 提供状況
- 提供済み:
  - 一覧・有効化・順序変更・削除・更新・導入・入力解決
- 不足:
  - plugin 実行の timeout/cancel
  - plugin 側へ渡す context が `timeZone` のみ
  - バッチ登録/進捗通知などの高水準 API なし

### 1-6. Electron-Web 分離
- 概ね良好。
- ただし `Ctrl/Cmd+W` のタブクローズ処理が main 側通知と web 側 keydown の二重定義。

### 1-7. ライブラリ選定・バージョン（Electron+Vite vs Electron-Vite）
- 現状は `vite-plugin-electron`（simple API）で Electron+Vite を成立させており、設計としては妥当。
- `electron-vite` へ移行すると、
  - 利点: 設定集約、Electron 用の規約化、CLI 一体運用
  - 欠点: 移行コスト、既存ビルド・配布スクリプト再調整
- 結論: 現時点は「必須移行」ではない。機能追加より先に、現構成の負債解消（上記 1-1〜1-5）を優先すべき。

### 1-8. 不要設定・一時設定残存
- `validationMode` は設定 UI/型に存在するが、実装上 `manual` の意味がほぼ機能していない。
- `videoSource:validate` IPC は公開されているが、現行フローでは有効活用されていない。
- 開発スクリプト/lockfile が `pnpm` 前提（`packageManager` も `pnpm`）で、運用方針（yarn）と不一致。

## 2. 推奨アクション
1. `validationMode` の仕様を確定し、`manual` なら登録処理とキュー処理を分岐実装。
2. plugin 実行に timeout + try/catch + エラー正規化を導入。
3. 未使用ファイル/アセット削除、E2E の現行UI追従更新。
4. store と plugin manager を usecase 単位で分割（例: register, groups, tabs, plugins）。
5. package manager 方針を `yarn` に統一するなら lockfile・scripts・CI を合わせて更新。
