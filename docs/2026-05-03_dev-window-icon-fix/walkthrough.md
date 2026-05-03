# 修正内容の確認

## 原因
- `build/icon.ico` の中身が ICO ではなく PNG だった。
- そのため Windows のウィンドウアイコンとして正しく適用されない状態だった。

## 対応内容
- `build/icon.png` を元に、`ffmpeg` で `build/icon.ico` を正規ICOとして再生成。
- `src/electron/main/index.ts` の `resolveWindowIconPath()` を拡張し、以下を探索対象に追加。
  - `process.cwd()/build/icon.ico|png`
  - `currentDir` からの相対解決 `../../../build/icon.ico|png`
  - `app.getAppPath()/build/icon.ico|png`
  - `process.resourcesPath/build/icon.ico|png`
  - `process.resourcesPath/icon.ico|png`
- `BrowserWindow` 生成後に `mainWindow.setIcon(windowIconPath)` を明示実行。

## 実行確認
- `yarn eslint src/electron/main/index.ts` : 成功
- `yarn typecheck` : 成功

## 補足
- 変更反映後は、既存の `yarn dev` プロセスを完全停止して再起動が必要。
