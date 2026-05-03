# 実装計画

1. `video.twimg.com` 向け `onBeforeSendHeaders` のヘッダー補正を確認する。
2. 大文字/小文字キー差異の影響を避けるため、lowercaseキーで強制上書きする。
3. `Referer/Origin/Accept/User-Agent/Range` を確実に設定する。
4. `yarn typecheck` で確認する。
