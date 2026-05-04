# 実装計画

1. acquire/release の非同期順序でリークが起きる条件を確認する。
2. acquire済みフラグを導入し、未acquire状態でのrelease送信を防ぐ。
3. acquire完了後にdispose済みなら必ずreleaseされるようにする。
4. 型チェックを実行する。
