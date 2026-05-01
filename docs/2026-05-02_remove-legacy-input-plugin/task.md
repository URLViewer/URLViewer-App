# task

## 目的
- `UrlViewer-App` 内から、旧入力変換機能に関連する実装・設定・文書記述を完全に除去する。

## 実施項目
- [x] `external/plugins/<optional-input-plugin>` 一式の削除
- [x] `src/web/plugins/registry.ts` の旧オプショナル入力プラグイン静的 import 削除
- [x] `src/shared/pluginCatalog.ts` から旧オプショナル入力プラグイン manifest/seed 削除
- [x] `src/electron/services/pluginManager.ts` の旧オプショナル入力プラグイン ID フィルタ除去
- [x] `tsconfig.json` / `vite.config.ts` の旧入力変換 alias 削除
- [x] `src/shared/<legacy-input-module>.ts` の削除
- [x] `docs/` 内の旧入力変換関連記述の置換

## 完了条件
- [x] 旧入力変換機能に紐づく固有語が App 内に残っていない
