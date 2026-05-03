# 修正内容の確認

- 対象ファイル: `src/electron/main/index.ts`
- `installTwitterVideoHeaderHook` 内で、以下を nullish 代入ではなく強制上書きに変更。
  - `headers.referer = "https://x.com/"`
  - `headers.origin = "https://x.com"`
  - `headers.accept = "video/mp4,video/*;q=0.9,*/*;q=0.8"`
  - `headers["user-agent"] = (Chrome互換UA)`
  - `headers.range` が無い場合は `bytes=0-` を設定

これにより、`Referer: http://localhost:5173/` や `url-viewer/...` UA がそのまま送信される状態を回避できる。

- 検証: `yarn typecheck` 成功。
