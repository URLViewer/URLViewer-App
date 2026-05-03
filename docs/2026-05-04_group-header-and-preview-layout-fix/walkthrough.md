# 修正内容の確認

## グループ上部レイアウト

- `GroupPanel.tsx` の上部を `space-y-2` の2段構成へ変更。
- 1段目: グループ名入力 + 作成 + お気に入り追加。
- 2段目: `選択` ボタンを右寄せ配置。

## 動画プレビュー歪み修正

- `VideoPlayer.tsx` の `captureSeekPreviewImage` で、
  - キャンバス全体を黒で塗る
  - `videoWidth/videoHeight` からスケール計算
  - 中央寄せで `drawImage`
  に変更。
- これにより引き伸ばしを回避し、ビューワーの `object-contain` に近いプレビュー表示にした。

## スタイル調整

- `index.css` の `.viewer-seek-preview-image` を `object-fit: contain` へ変更。
- 背景を黒にしてレターボックス時の見た目を安定化。

## 検証

- `yarn typecheck` 成功。
