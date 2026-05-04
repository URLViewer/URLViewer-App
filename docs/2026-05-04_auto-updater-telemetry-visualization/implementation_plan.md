# 実装計画

1. updaterイベントを表現する共通型を追加する。
2. mainプロセスの update provider で、`checking/available/not-available/download-progress/downloaded/error/check-failed` をイベント化する。
3. main から renderer へ IPC イベント配信 (`updater:event`) を追加する。
4. preload で購読APIを公開する。
5. App で購読して activity log へ流し、既存トースト表示フローで可視化する。
6. 型チェックを実行する。
