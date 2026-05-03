# 修正内容の確認

## 1) 検証リクエストの戦略変更

- `src/electron/services/videoSourceResolver.ts`
  - `GET + Range (bytes=0-1048575)` を最初に実行するよう変更。
  - 失敗時のみ `HEAD` と必要に応じたフォールバックを使う。
  - detail に `strategy=...` を残し、判定経路を追えるようにした。

## 2) X/Twitter向けヘッダー最適化

- `src/electron/services/videoSourceResolver.ts`
  - `video.twimg.com` の場合に以下を設定:
    - `Accept: video/mp4,video/*;q=0.9,*/*;q=0.8`
    - `Referer: https://x.com/`
    - `Origin: https://x.com`
    - ブラウザ相当 `User-Agent`

## 3) 実再生リクエストのヘッダー補正

- `src/electron/main/index.ts`
  - `webRequest.onBeforeSendHeaders` を追加し、`https://video.twimg.com/*` への送信ヘッダーを補正。
  - ウィンドウ生成時に一度だけフックをインストール。

## 4) 検証

- `yarn typecheck` 成功。

## 補足

- `main` プロセス側変更を反映するため、アプリ再起動が必要。
