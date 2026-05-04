# 実装計画

1. 再生プラグイン解決ロジックを確認し、OFF時にHTML5へフォールバックしているかを検証する。
2. `video.twimg.com` URLについては、twitter-video-access が無効なら必ず `null` を返すようにする。
3. 既存の VideoPlayer の effect 再実行（plugins依存）により、再読込・再評価されることを利用する。
4. 型チェックを実行する。
