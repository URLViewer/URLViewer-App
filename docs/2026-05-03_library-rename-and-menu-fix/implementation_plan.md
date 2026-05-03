# 実装計画

1. ライブラリ表示順の安定化
- `LibraryPanel` の名前ソート処理を削除し、`library.videos` の順序をそのまま表示する。
- これにより、リネーム時に表示位置が変わる副作用を防ぐ。

2. 動画名編集フローの見直し
- 入力中はコンポーネント内のドラフト状態を更新する。
- `onBlur` / `Enter` でのみ `renameVideo` を呼び出して永続化する。
- `Escape` でドラフト編集を破棄できるようにする。

3. リネームアクションの応答性改善
- `renameVideo` で `save` 完了待ちの前に Zustand 状態を更新する。
- UI反映遅延の影響を最小化する。

4. リリース時メニュー非表示化
- Electron メインプロセスでリリース起動時に `Menu.setApplicationMenu(null)` を適用する。
- `BrowserWindow` に `autoHideMenuBar: true` を設定し、加えて `setMenuBarVisibility(false)` を適用する。

5. 動作確認
- 変更ファイルに対して ESLint を実行する。
- TypeScript の型チェックを実行する。
- 重複URL登録仕様を IPC 実装から確認する。
