# 実装計画

1. Playback失敗時に `detail` を渡せるよう、`markPlaybackFailed` のシグネチャを拡張する。
2. HLS/HTML5の失敗分類時に、可能な範囲で詳細文字列（type/details/http/url等）を付与する。
3. VideoPlayer から失敗詳細を `markPlaybackFailed` へ渡す。
4. librarySlice のログ追加で `detail` を保存する。
5. `yarn typecheck` で確認する。
