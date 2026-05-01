# タスクリスト

## 目的
前回の実装内容（M3u8Viewer初期構築）を、後続メンバーが追跡できる形でドキュメント化する。

## 完了タスク
- Electron + Vite + React + TypeScript の土台を作成
- `src/electron` / `src/web` / `src/shared` 分離構成を導入
- 入力変換ライブラリを利用したURL候補解決処理を実装
- 複数入力（改行/カンマ/空白区切り）と入力検証を実装
- URL候補の順次検証（primary -> fallback-original -> fallback-plus-9h）を実装
- 3候補失敗時の動画候補除外を実装
- hls.jsベース動画プレイヤー（5秒/10秒スキップ、速度変更、レジューム）を実装
- ユニーク動画パネル/グループパネル/タブUI/設定パネルを実装
- `electron-store` で設定・ライブラリ・タブ・再生位置永続化を実装
- updater将来導入用の抽象インターフェースを追加
- VitestユニットテストとPlaywright最小E2Eを追加
- `typecheck` / `lint` / `test` / `e2e` / `build` の通過を確認

## フォローアップ
- E2Eケースを主要導線以外（タブ復元、グループ複数所属、除外挙動）まで拡張
- 巨大chunk警告への対応（分割読み込みなど）
- updater実装（GitHub Releases連携）
