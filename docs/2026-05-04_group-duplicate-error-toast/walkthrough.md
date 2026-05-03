# 修正内容の確認

- `src/web/store/slices/librarySlice.ts` の `addGroup` を修正。
  - `invalid-name` 時:
    - `lastMessage` 設定
    - `appendLog({ level: "error", scope: "groups", message })`
  - `duplicate` 時:
    - `lastMessage` 設定
    - `appendLog({ level: "error", scope: "groups", message })`

これにより、同名グループ作成失敗時に
- 右下トースト（error）
- 活動ログへの追加
- 未読ログバッジ
が有効になる。

## 検証

- `yarn typecheck` 成功。
