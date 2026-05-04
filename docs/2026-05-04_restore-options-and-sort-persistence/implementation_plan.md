# 実装計画

1. 共有型/スキーマに復元設定項目とUI並び替え状態を追加する。
2. Electron StoreにUI状態を永続化する `getUiState/saveUiState` を追加する。
3. 保存処理をサーバー側でサニタイズし、OFF設定の情報を実際に保存しないようにする。
   - タブ情報
   - resumeSeconds
   - ライブラリ並び替え状態
4. IPC `ui:get` / `ui:save` を追加し、preload/vite-env/mock APIを更新する。
5. フロントの初期化処理で並び替え状態を復元し、設定OFF時はデフォルト適用にする。
6. 設定パネルUIを更新する。
7. 型チェックを実行する。
