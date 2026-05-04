# 修正内容の確認

## 1. 共通型
- `src/shared/types.ts`
  - 追加:
    - `UpdaterEventLevel`
    - `UpdaterEventType`
    - `UpdaterTelemetryEvent`

## 2. updater provider 側のイベント化
- `src/electron/updater/provider.ts`
  - `createUpdateProvider(onTelemetry?)` を導入。
  - 収集イベント:
    - checking-for-update
    - update-available
    - update-not-available
    - download-progress
    - update-downloaded
    - error
    - checkForUpdates の catch
  - `formatUpdaterErrorDetail` で error detail を整形。

## 3. main から renderer へブロードキャスト
- `src/electron/main/index.ts`
  - `broadcastUpdaterEvent()` を追加。
  - provider作成時に telemetry callback を注入。
  - `checkForUpdates()` の戻り値サマリも `type=status` として通知。

## 4. preload / renderer API
- `src/electron/preload/index.ts`
  - `app.onUpdaterEvent(callback)` を追加。
- `src/web/vite-env.d.ts`
  - 同API型定義を追加。
- `src/web/utils/mockApi.ts`
  - `onUpdaterEvent` モックを追加。

## 5. App統合
- `src/web/App.tsx`
  - `onUpdaterEvent` を購読し、`appendLog` で `scope: updater` のログを追加。
  - 既存のログ由来トースト機構で success/error を表示可能。

## 6. 検証
- `yarn typecheck` 成功。
