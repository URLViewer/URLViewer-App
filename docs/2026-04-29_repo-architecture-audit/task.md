# タスク

## 依頼内容
このリポジトリの現段階の構成を分析し、以下の観点でリファクタリング余地を調査する。

- 使われていないファイル、ディレクトリ、ライブラリ
- ディレクトリ/ファイル構成の可読性・保守性
- Core-Plugin の責任分離
- プラグインの開発/追加容易性
- Core 側が提供するプラグイン活用 API の妥当性
- Electron-Web 分離
- ライブラリ選定・バージョン妥当性（Electron+Vite vs Electron-Vite）
- 一時設定や不要設定の残存

## 調査結果サマリー
- 全体: **基盤は概ね良好**（`src/electron` / `src/web` / `src/shared` の分離、preload 境界あり）。
- 主要課題:
  - 未使用/陳腐化アセット・ファイルが残存
  - 設定の一部が未実装（`validationMode=manual`）
  - プラグイン実行制御に欠落（timeout 未適用、例外保護不足）
  - 巨大ファイル化（`appStore.ts`, `pluginManager.ts`）

## 優先対応
1. `validationMode` の実装整合（手動モードの実体化 or 設定削除）
2. `PluginManager.resolveInput` へ timeout/cancel/例外ハンドリング導入
3. 未使用物の整理（旧入力パネル, `public/icons.svg`, `public/favicon.svg`, 古い E2E）
4. `src/web/store/appStore.ts` と `src/electron/services/pluginManager.ts` の分割
