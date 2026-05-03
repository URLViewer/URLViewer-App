# 実装計画

1. 現状確認
- プロジェクト内のアイコンファイル配置を確認する。

2. `BrowserWindow` の `icon` 解決ロジック修正
- 固定パスを廃止し、候補パスの存在確認で解決する関数を導入する。
- 候補は `build/icon.ico` を優先し、配布環境も考慮して `process.resourcesPath` 側も確認する。

3. 検証
- `yarn eslint src/electron/main/index.ts`
- `yarn typecheck`
