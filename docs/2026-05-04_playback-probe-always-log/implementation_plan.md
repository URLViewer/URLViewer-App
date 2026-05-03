# 実装計画

1. 再生失敗時の detail に media要素状態（currentSrc/readyState/networkState）を追加する。
2. `videoSource.validate` の probe結果を、valid/invalid/error いずれでも detail に追記する。
3. 既存detailに probe行がなければ必ず追加する。
4. `yarn typecheck` で確認する。
