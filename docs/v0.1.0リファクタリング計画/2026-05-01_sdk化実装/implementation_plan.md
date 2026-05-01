# implementation_plan

## 方針
1. 先に SDK を作って契約型を固定する。
2. 既存コードは破壊せず、`src/shared/types.ts` から再exportして段階移行する。
3. 最後に lint で依存境界を強制する。

## 実装手順
1. `packages/plugin-sdk/src/index.ts` に plugin 公開型を定義。
2. `tsconfig.json` / `vite.config.ts` に `@m3u8viewer/plugin-sdk` alias を追加。
3. `src/shared/types.ts` の plugin 関連型を SDK 起点に変更。
4. `external/plugins/<optional-input-plugin>/index.ts` を self-contained 化。
   - `@shared/pluginCatalog` を削除
   - `@shared/<legacy-module>` を削除
   - `@web/plugins/types` を削除
   - `plugin.json` を直接参照
5. `eslint.config.mjs` に `external/plugins/**/*` 向け `no-restricted-imports` を追加。

## 検証
- `yarn lint`
- `yarn typecheck`
- 追加確認: `rg -n "@shared/|@web/|@electron/" external/plugins`

