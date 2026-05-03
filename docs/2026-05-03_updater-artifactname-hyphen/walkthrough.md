# 修正内容の確認

## 変更内容
- `package.json` の `build` に以下を追加。
  - `"artifactName": "${productName}-Setup-${version}.${ext}"`

## 検証結果
- ビルドコマンド: `yarn electron-builder --publish never`
- 生成成果物:
  - `release/UrlViewer-Setup-0.0.2.exe`
  - `release/UrlViewer-Setup-0.0.2.exe.blockmap`
- `release/latest.yml`:
  - `path: UrlViewer-Setup-0.0.2.exe`
  - `files[0].url: UrlViewer-Setup-0.0.2.exe`

## 結論
- 最新メタデータと実ファイル名が一致し、updater のダウンロード解決に必要な命名整合が取れた。
