# 実装計画

1. Electron に汎用ヘッダー上書きポリシーマネージャを追加する。
2. IPC (`network:acquireHeaderOverride` / `network:releaseHeaderOverride`) を追加する。
3. main の `onBeforeSendHeaders` を汎用化し、IPCで登録されたルールのみ適用する。
4. twitter-video-access を renderer のビルトイン playback plugin として実装し、再生開始時に acquire、終了時に release する。
5. 型定義・preload・vite-env・mock API を更新して整合性を取る。
6. 型チェックを実行する。
