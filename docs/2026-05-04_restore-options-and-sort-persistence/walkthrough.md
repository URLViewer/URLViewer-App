# 修正内容の確認

## 1. 共有型とスキーマ
- `src/shared/types.ts`
  - `AppSettings` に追加:
    - `restorePlaybackOnLaunch`
    - `restoreLibrarySortOnLaunch`
  - 追加:
    - `LibrarySortKey`, `SortOrder`, `UiState`
- `src/shared/schemas.ts`
  - `appSettingsSchema` に同項目を追加
  - `uiStateSchema` を追加

## 2. デフォルト値
- `src/shared/defaults.ts`
  - `DEFAULT_SETTINGS` に新設定を追加
  - `DEFAULT_UI_STATE` を追加

## 3. Electron永続化（保存しない制御をバックエンドで保証）
- `src/electron/store/appStore.ts`
  - `PersistedState` に `ui` を追加
  - `dataVersion` を `4` に更新
  - 追加メソッド:
    - `getUiState()`
    - `saveUiState()`
  - 保存サニタイズを追加:
    - `saveLibrary()` で `restoreTabsOnLaunch=false` なら tabs を空保存
    - `saveLibrary()` で `restorePlaybackOnLaunch=false` なら `resumeSeconds` を除外保存
    - `saveResume()` は `restorePlaybackOnLaunch=false` なら永続化しない
    - `saveSettings()` で `restoreLibrarySortOnLaunch=false` なら `ui` をデフォルトへクリア

## 4. IPC API追加（疎結合）
- `src/electron/ipc/handlers.ts`
  - 追加: `ui:get`, `ui:save`
- `src/electron/preload/index.ts`
  - 追加: `window.m3u8Viewer.ui.get/save`
- `src/web/vite-env.d.ts`
  - 同APIを型定義へ追加
- `src/web/utils/mockApi.ts`
  - `ui` APIモックを追加

## 5. フロント復元ロジック
- `src/web/store/slices/uiSlice.ts`
  - `loadInitialData()` で `ui:get` を読み込み
  - `restoreLibrarySortOnLaunch` がONなら保存値、OFFなら `DEFAULT_UI_STATE` を適用
  - `restorePlaybackOnLaunch` がOFFならロード時に `resumeSeconds` を除去
  - `setLibrarySort()` / `toggleLibrarySortOrder()` を非同期化し、設定ON時のみ `ui:save`

## 6. 設定UI
- `src/web/features/settings/SettingsPanel.tsx`
  - 「起動時に復元するもの」セクションを追加
    - タブ
    - 再生していた動画
    - ライブラリの並び替え

## 7. 追随修正
- `src/web/store/appStore.ts`
  - `createUiActions(set, get)` へ変更
- `src/web/store/appStoreTypes.ts`
  - sort型をsharedへ寄せ、sort操作を `Promise<void>` 化
- `src/web/features/library/LibraryPanel.tsx`
  - sort操作呼び出しを `void` 付きに更新
- `src/web/features/library/sortVideos.ts`
  - sort型import先をsharedへ変更

## 8. 検証
- `yarn typecheck` 成功
