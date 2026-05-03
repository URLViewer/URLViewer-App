# 実装計画

1. Electron main で `video.twimg.com` 宛リクエストの実行結果を収集するトレース機構を追加する。
2. IPC (`videoSource:getPlaybackTrace`) を追加し、renderer から直近トレースを取得できるようにする。
3. 再生失敗時の detail 生成処理で、既存の `probe` 情報に加えてトレース情報を連結する。
4. HTML5再生プラグインを `video.src` 直指定から `source` 要素 + MIME type 指定方式へ変更する。
5. `yarn typecheck` で整合性を確認する。
