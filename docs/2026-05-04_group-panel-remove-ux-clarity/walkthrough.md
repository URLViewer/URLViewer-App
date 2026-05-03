# 修正内容の確認

## 1) グループパネルの削除挙動

- `GroupPanel.tsx` 側の動画削除確認は「この動画をグループから外しますか？」となっており、確定時に `removeVideoFromGroup(groupId, videoId)` を呼ぶ実装であることを確認した。

## 2) 「グループに追加」UIの視認性改善

- `VideoPlayer.tsx` の各グループ行に以下を追加。
  - `title`（追加/解除の操作説明）
  - `aria-pressed`（追加済み状態）
  - 右側メタ表示を状態バッジ化（`追加済み` / `未追加`）
  - 追加済み時にチェックアイコン表示

## 3) スタイル調整

- `index.css` で以下を追加・変更。
  - 行に薄い境界を持たせる（`group-simple-item`）
  - 追加済み行の背景・境界色を強化（`group-simple-item-linked`）
  - 状態バッジの共通・追加済み・未追加スタイルを追加

## 4) 検証

- `yarn typecheck` 実行: 成功
