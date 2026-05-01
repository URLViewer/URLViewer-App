# 実装計画（調査計画）

## 1. 調査範囲
- 構成: `src/electron`, `src/web`, `src/shared`, `lib`, `test`, `docs`
- 設定: `package.json`, `vite.config.ts`, `tsconfig*`, `eslint.config.js`, `playwright.config.ts`
- プラグイン: `pluginManager`, builtin plugin, plugin contract ドキュメント

## 2. 実施手順
1. ファイル一覧・主要設定の確認
2. Core/Plugin/Electron-Web 境界の実装確認
3. 未使用候補の抽出（参照 grep）
4. テスト/設定の現状整合確認
5. 改善提案の優先度付け

## 3. 評価基準
- 実際に参照されているか（未使用判定）
- 変更時の影響範囲が局所化される構造か
- 契約（types/schema/doc）と実装が一致しているか
- 拡張点（プラグイン API）が過不足なく提供されているか
- 一時的ワークアラウンドが恒久化されていないか

## 4. 注意事項
- この環境では `pnpm`/`node` が `mise-shim` 制約で実行失敗したため、
  lint/test/typecheck の再実行は未完了（既存コード・設定の静的読解ベースで評価）。
