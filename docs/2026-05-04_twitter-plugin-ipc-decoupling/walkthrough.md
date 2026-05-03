# 修正内容の確認

## 1. Electron側の抽象化API
- 追加: `src/electron/services/networkHeaderOverrideManager.ts`
  - ルールの `acquire/release`（参照カウント付き）
  - `requestUrl` と `hosts` マッチでヘッダー上書き
- 追加IPC:
  - `network:acquireHeaderOverride`
  - `network:releaseHeaderOverride`
- 反映箇所:
  - `src/electron/ipc/handlers.ts`
  - `src/electron/preload/index.ts`
  - `src/web/vite-env.d.ts`
  - `src/web/utils/mockApi.ts`

## 2. mainの疎結合化
- `src/electron/main/index.ts`
  - Twitter 固有ロジックを除去。
  - `onBeforeSendHeaders` は汎用で常駐し、`applyNetworkHeaderOverrides` の結果だけ適用。
  - どのサイトに何を上書きするかは main が知らず、IPC登録ルールに依存。

## 3. twitter-video-access プラグイン
- 追加: `src/web/plugins/builtin/twitterVideoAccessPlaybackPlugin.ts`
  - `video.twimg.com` を `canHandle`
  - `mount` 時に `network.acquireHeaderOverride(...)`
  - `unmount` 時に `network.releaseHeaderOverride(...)`
  - ポリシー内容: referer/origin/accept/user-agent/range補完
- 登録:
  - `src/web/plugins/registry.ts`
  - `src/shared/pluginCatalog.ts`

## 4. 優先解決
- `src/web/plugins/registry.ts`
  - Twitter URL の場合は `builtin.playback.twitter-video-access` を優先選択。
  - これにより既存 order 状態でも twitter プラグイン経由で適用される。

## 5. 検証
- `yarn typecheck` 成功。
