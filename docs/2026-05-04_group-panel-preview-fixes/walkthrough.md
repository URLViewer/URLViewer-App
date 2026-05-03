# 修正内容の確認

## 1) お気に入り星マークずれ修正

- `GroupPanel.tsx` のグループタイトル部分を、
  - 星アイコン
  - グループ名テキスト
  を `inline-flex` で並べる構造に変更。
- `index.css` の `.group-card-title` を `inline-flex + items-center` にして縦位置を一致させた。

## 2) 動画プレビューが出ない問題の修正

- 根本原因として、`previewCanvasRef` を参照しているのに DOM に `<canvas>` が存在していなかったため、サムネイル生成が常に失敗していた。
- `VideoPlayer.tsx` の `viewer-stage` 内に隠し `<canvas ref={previewCanvasRef}>` を追加。

## 3) m3u8系ソースでのプレビュー生成強化

- これまでのプレビュー動画は `video.src = sourceUrl` の直指定のみで、再生プラグイン経由の動画（特に HLS）に弱かった。
- プレビュー動画初期化でも `resolvePlaybackPlugin(sourceUrl, plugins)` を使ってマウントするように変更。
- `previewReadyRef` を追加し、`loadedmetadata/canplay` 後のみキャプチャを実行するようにした。

## 4) 検証

- `yarn typecheck` 実行: 成功
