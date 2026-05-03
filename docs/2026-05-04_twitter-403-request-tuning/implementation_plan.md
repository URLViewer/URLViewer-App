# 実装計画

1. `videoSource` 検証を `HEAD` 優先から `GET + Range` 優先へ変更する。
2. `video.twimg.com` 向けに `User-Agent`/`Referer`/`Origin`/`Accept` を明示する。
3. Electron本体の実再生リクエストでも同様ヘッダーを補正する。
4. 型チェックで破綻がないことを確認する。
