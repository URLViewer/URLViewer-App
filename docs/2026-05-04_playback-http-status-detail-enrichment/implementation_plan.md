# 実装計画

1. `videoSource.validate` がネットワーク失敗時に詳細（HTTPステータスやエラー）を返せるように拡張する。
2. `videoSource.register` の rejected 結果にも `detail` を流す。
3. 再生失敗時（VideoPlayer）に `validate` を再実行して detail を補強し、ログへ渡す。
4. 登録失敗ログの詳細整形も `detail` を含める。
5. `yarn typecheck` で確認する。
