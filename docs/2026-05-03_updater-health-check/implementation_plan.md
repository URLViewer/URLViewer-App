# 実装計画

1. 実装確認
- `src/electron/updater/provider.ts` を確認し、起動時チェック、イベント、dev/本番条件を確認する。

2. 設定確認
- `package.json` の `build.publish`、`win/nsis` 設定を確認する。
- `.github/workflows/release.yml` のタグ起動条件とアップロード対象を確認する。

3. 実機相当検証
- `electron-builder --publish never` を実行し、`latest.yml` とインストーラーの生成結果を確認する。
- `latest.yml` の `path/url` と実際の成果物名の整合性を確認する。

4. 判定
- updaterが成立する条件と、現状の失敗リスクを整理する。
