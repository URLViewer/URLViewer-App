# 修正内容の確認

- 対象: `src/web/plugins/builtin/twitterVideoAccessPlaybackPlugin.ts`
- 追加: `acquired` フラグ。
- `releasePolicy` 条件を `released || !acquired` に変更。
- `acquireHeaderOverride` 成功後に `acquired = true` を設定。

## 直した競合
- 以前は「unmountが先→release送信(未acquireで無効)→その後acquire成功→releaseされない」という順序でルール残留の可能性があった。
- 今回の修正で acquire後にのみrelease対象となるため、dispose済みケースでも確実に解放される。

## 検証
- `yarn typecheck` 成功。
