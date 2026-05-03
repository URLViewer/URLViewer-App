# 実装計画

1. 原因調査
- `build/icon.ico` の実体ヘッダを確認し、ICO形式かどうか判定する。
- `BrowserWindow` の `icon` 解決ロジックが dev 実行で到達可能か確認する。

2. 修正
- 実体が PNG だった `build/icon.ico` を正規ICOとして再生成する。
- `resolveWindowIconPath` の探索候補を dev/release 両対応に拡張する。
- `BrowserWindow` 作成後に `setIcon` を明示実行する。

3. 検証
- `yarn eslint src/electron/main/index.ts`
- `yarn typecheck`
