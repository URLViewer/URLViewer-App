# task

## 目的
- 外部プラグインが Core 内部実装 (`@shared/*`, `@web/*`, `@electron/*`) に依存せず、SDKのみで開発できる状態にする。

## 実施項目
- [x] `@m3u8viewer/plugin-sdk` を追加
- [x] plugin契約型（manifest/runtime/playback failure）を SDK に移設
- [x] `オプショナル入力プラグイン` から内部importを除去
- [x] `オプショナル入力プラグイン` がローカル `plugin.json` を唯一のmanifest参照源として動作
- [x] external plugin の内部import禁止ルールを追加

## 完了条件
- [x] `external/plugins/**/*` に `@shared/*`, `@web/*`, `@electron/*` import が存在しない
- [x] 型チェックとlintが通る

