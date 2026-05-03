# 実装計画

1. `addGroup` の失敗分岐（重複名）で `lastMessage` だけでなく `appendLog(level: error)` も呼ぶ。
2. ついでに不正名（1〜10文字違反）も同様に error ログへ載せる。
3. 既存のトースト表示は `activityLogs` の `error/success` に連動しているため、追加実装だけで通知/未読バッジに反映されることを確認する。
4. `yarn typecheck` を実行する。
