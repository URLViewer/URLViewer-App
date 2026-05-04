# 修正内容の確認

## 現状確認
- `resolvePlaybackPlugin` は Twitter専用プラグインが見つからない場合でも、その後の通常ループで `html5` にフォールバックしていた。
- そのため、twitter-video-access をOFFにしても再生が継続できるケースがあった。

## 修正
- `src/web/plugins/registry.ts`
  - `video.twimg.com` の場合、専用プラグインが有効で解決できなければ `return null` するよう変更。
  - コメント: `Twitter URL は専用プラグインが無効なら再生を許可しない。`

## 効果
- OFF: plugin state 更新で VideoPlayer effect が再実行され、再生プラグイン解決が `null` になり再生不可。
- ON: plugin state 更新で再評価され、専用プラグイン経由でポリシー取得後に再生可能。
- 期待どおり、ON/OFFの入力に対して再生可否が純粋に決まる挙動になる。

## 検証
- `yarn typecheck` 成功。
