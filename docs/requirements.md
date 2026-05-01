# M3u8Viewer 要件定義書（Core + Plugin）

## 1. 目的
- 主機能を `.m3u8 URL入力 -> 検証 -> 動画登録` に再定義する。
- 入力変換は主機能から外し、オプショナルな入力プラグインとして提供する。

## 2. 技術スタック
- Electron
- Vite + React + TypeScript
- hls.js
- Zustand
- electron-store
- Tailwind CSS + CSS変数
- isomorphic-git（Git導入/更新）
- keytar（プライベートGitトークン保存）

## 3. 機能要件
- Core入力:
  - `.m3u8 URL` の複数入力（改行/カンマ/空白区切り）に対応。
  - URL形式、到達性、m3u8シグネチャ検証に成功したものだけ登録。
- Plugin入力:
  - 入力パネル拡張はプラグインで提供。
  - 入力プラグインは `input -> URL候補[]` を返し、Core検証パイプラインへ渡す。
- プラグイン管理:
  - 一覧、詳細、On/Off、表示順変更（UI順のみ）
  - 導入: zip / フォルダ / Git URL
  - 削除、Git手動更新
- 動画管理:
  - 再生可能動画をライブラリへ保存、複数タブで再生
  - グループ作成・所属（重複所属可）
  - 生存URLエクスポート
- 設定:
  - 起動時タブ復元
  - 検証モード（`on-register` / `manual`）
  - 検証並列数
  - 検証タイムアウト

## 4. Plugin Contract v1
- `plugin.json` 必須:
  - `id`, `name`, `version`, `apiVersion`, `entry`, `capabilities`
- `apiVersion` は `1.0.0` 固定。不一致は読込拒否。
- capability は `input-panel` のみ許可。
- プレイヤーなど入力パネル以外へのUI注入は禁止。

## 5. 永続化データ
- `settings`:
  - `restoreTabsOnLaunch`
  - `validationMode`
  - `validationConcurrency`
  - `validationTimeoutMs`
- `library`:
  - `videos`: `id`, `label`, `sourceUrl`, `lastValidatedAt`, `resumeSeconds`, `addedByPluginId`
  - `groups`: `id`, `name(1..10)`, `videoIds`
  - `tabs`: `openVideoIds`, `activeVideoId`
- `plugins`:
  - `schemaVersion`
  - `items`: enabled/order/source/path/manifest/panel

## 6. 移行方針
- データバージョンで判定し、旧入力モデルのデータは初回起動時にリセット。
- 新形式（Core URL中心）で再初期化する。

## 7. ディレクトリアーキテクチャ
- `src/electron`
  - `main`: 起動、ショートカット、IPC登録
  - `ipc`: `videoSource:*`, `plugins:*`, `settings:*`, `library:*`, `player:*`
  - `services`: `videoSourceResolver`, `pluginManager`, `keychain`
  - `plugins`: プラグイン関連機能
  - `store`: 永続化
- `src/web`
  - `features/input`: Core URL入力 + 有効プラグイン入力
  - `features/plugins`: プラグイン管理UI
  - `features/library/groups/tabs/player/settings/queue`
  - `store`: Zustand
- `src/shared`
  - 型、zodスキーマ、既定値

## 8. 非対象
- 動画ダウンロード
- アカウント/クラウド同期
- 初版でのプラグイン署名検証
