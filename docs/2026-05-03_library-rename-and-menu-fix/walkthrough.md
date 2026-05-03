# 修正内容の確認

## 変更概要
- ライブラリ一覧の表示順を名前ソートから登録順へ変更。
- 動画名編集を「入力中ドラフト保持 + 確定時保存」に変更。
- リリース時の Electron メニューバーを非表示化。
- 重複URL登録の現状仕様を確認。

## 変更ファイル
- `src/web/features/library/LibraryPanel.tsx`
  - `sortedVideos` を削除し `videos` をそのまま描画。
  - `draftLabels` を導入し、入力中はローカル state のみ更新。
  - `onBlur` / `Enter` で `commitLabelEdit` を実行し、名前を確定保存。
  - `Escape` でドラフトを破棄。
- `src/web/store/slices/librarySlice.ts`
  - `renameVideo` で `set({ library: nextLibrary })` を `save` より先に実行。
- `src/electron/main/index.ts`
  - リリース時に `Menu.setApplicationMenu(null)` を設定。
  - `BrowserWindow` に `autoHideMenuBar: true` を設定。
  - リリース時に `mainWindow.setMenuBarVisibility(false)` を適用。

## 仕様確認（重複URL登録）
- `src/electron/ipc/handlers.ts` の `videoSource:register` で、`normalizedUrl` を使って既存動画を検索している。
- 同一URLが既に存在する場合は新規追加せず、既存動画の `lastValidatedAt` のみ更新して `registered` を返す。
- したがって「同じURLで登録名だけ変えて再登録」は重複追加されない。
- ただし、再登録時に新しい登録名へ変更はされない（既存ラベルを維持）。

## 実行した確認コマンド
- `yarn eslint src/web/features/library/LibraryPanel.tsx src/web/store/slices/librarySlice.ts src/electron/main/index.ts`
- `yarn typecheck`

## 備考
- `yarn lint`（全体実行）は既存ファイル由来のエラーが別途存在するため、この対応では対象外。
