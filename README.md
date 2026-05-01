# M3u8Viewer

URLを動画ソースとして登録・管理する Electron アプリです。再生機能はプラグインで拡張できます。

## 開発
```bash
yarn install
yarn dev
```

## 品質チェック
```bash
yarn lint
yarn test
yarn typecheck
```

## E2E
```bash
yarn e2e
```

## 配布ビルド
```bash
yarn dist
```

## リリース（GitHub Releases）

タグ `v*` を push すると、GitHub Actions が Windows 配布物をビルドして GitHub Releases へ公開します。

- Workflow: `.github/workflows/release.yml`
- Publish先: `URLViewer/UrlViewer-App` Releases
- 実行コマンド: `yarn dist:publish`

### ローカルで手動公開する場合
```bash
yarn dist:publish
```

`GH_TOKEN` が必要です（`repo` 権限を含むトークン）。

## 自動アップデート

- 本番（`app.isPackaged === true`）で起動時に更新確認を実行します。
- 新版のダウンロード完了後、再起動確認ダイアログを表示します。
- 開発中は既定で updater を無効化します。
- GitHub provider を使う場合、配布先 Releases は公開リポジトリ運用を推奨します。

環境変数:

- `URLVIEWER_DISABLE_UPDATER=1`: updater 強制無効化
- `URLVIEWER_ENABLE_DEV_UPDATER=1`: 開発時にも updater を有効化
- `URLVIEWER_ALLOW_PRERELEASE_UPDATES=1`: pre-release を更新対象に含める
