# 実装計画

1. `package.json` の `build` 設定に `artifactName` を追加する。
2. `electron-builder --publish never` を実行して成果物を再生成する。
3. 生成された `release/latest.yml` と `release` 内のファイル名整合を確認する。
