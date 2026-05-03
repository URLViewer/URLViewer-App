# 修正内容の確認

- 修正ファイル: `src/web/styles/index.css`
- `.app-toast-level-icon` の `@apply` を以下へ変更:
  - 変更前: `border-current/35`
  - 変更後: `border-white/60`
- これにより Tailwind クラス解決エラーを回避。

## 検証

- `yarn build` 成功（PostCSS エラー解消）。
