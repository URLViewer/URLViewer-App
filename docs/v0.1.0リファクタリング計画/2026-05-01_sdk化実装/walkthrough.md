# walkthrough

## 実施内容
- plugin SDK を `packages/plugin-sdk` として追加し、plugin 開発時に必要な契約型を一箇所へ集約した。
- Core 側は既存 import 互換を維持するため、`src/shared/types.ts` で SDK 型を再exportする構成にした。
- `オプショナル入力プラグイン` は SDK + ローカル実装のみで成立するように変更した。
  - manifest: `plugin.json` 直参照
  - 入力処理: プラグイン内関数として内包
- ESLint で external plugin の内部importを禁止し、今後の逆行を防止した。

## 効果
- 外部プラグインを別リポジトリで開発する前提に近い依存境界になった。
- Core 変更に巻き込まれにくくなり、プラグインの独立性が向上した。

