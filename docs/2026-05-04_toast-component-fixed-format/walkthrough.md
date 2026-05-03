# 修正内容の確認

## コンポーネント切り出し

- `src/web/components/AppToast.tsx` を追加。
- Props:
  - `level: "success" | "error"`
  - `message: string`
  - `onClose: () => void`
- トーストのラベル/アイコン/閉じるボタンをこのコンポーネントに集約。

## App.tsx 置換

- 既存のトーストDOM直書きを削除し、`<AppToast ... />` を使用。

## 固定サイズ・固定フォーマット

- `app-toast` を `h-16`, `w-[360px]`, `grid` レイアウトに変更。
- レベル表示列、メッセージ列、閉じるボタン列で固定構成化。

## 長文省略

- `app-toast-message` を `overflow-hidden + whitespace-nowrap + text-ellipsis` に変更。
- 全文は `title` 属性でホバー確認可能。

## 検証

- `yarn typecheck` 成功。
