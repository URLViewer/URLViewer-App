# 修正内容の確認

## 判定
- 現在構成では「更新チェック自体」は動作するが、「更新ダウンロード」は失敗する可能性が高い。

## 根拠
- `provider.ts` では本番起動時に `autoUpdater.checkForUpdates()` を実行しており、イベントハンドリングも実装済み。
- `package.json` の `build.publish` は GitHub provider 設定済み。
- `release.yml` はタグ push 時に `.exe/.blockmap/.yml` を Release へアップロードする構成。
- ただし、ローカル生成結果で以下の不整合を確認。
  - `release/latest.yml` の `path/url` は `UrlViewer-Setup-0.0.2.exe`
  - 実際の生成ファイル名は `UrlViewer Setup 0.0.2.exe`（スペース区切り）
- この不整合のまま同名資産がReleaseに無い場合、updaterは資産取得に失敗する。

## 実行コマンド
- `yarn electron-builder --dir --publish never`
- `yarn electron-builder --publish never`

## 推奨対応
- `artifactName` をハイフン区切りで固定し、`latest.yml` の値と実ファイル名を一致させる。
  - 例: `${productName}-Setup-${version}.${ext}`
