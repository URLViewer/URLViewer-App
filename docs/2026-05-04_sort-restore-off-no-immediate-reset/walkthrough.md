# 修正内容の確認

- 対象: `src/web/store/slices/uiSlice.ts`
- 変更: `saveSettings()` 内の以下ロジックを削除。
  - `restoreLibrarySortOnLaunch=false` 時に `librarySortKey/librarySortOrder` を `DEFAULT_UI_STATE` へ即時変更する処理。

## 挙動
- OFFにしても、その場の並び順は変わらない。
- OFF中は `ui:save` を呼ばないため並び替え状態は保存されない。
- 次回起動時は復元設定OFFに従いデフォルト並びになる。

## 検証
- `yarn typecheck` 成功。
