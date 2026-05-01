# M3u8Viewer プラグイン開発ガイド

## 1. 前提
- Plugin Contract: `apiVersion: "1.0.0"`
- プラグイン実行領域: **Renderer（`src/web/plugins`）**
- バックエンド機能が必要な場合: `window.m3u8Viewer` 経由の IPC API を使用

## 2. capability
- `input-panel`: 入力値から URL 候補を生成
- `playback`: URL を再生する実装を提供

## 3. マニフェスト拡張フィールド
`plugin.json` では次の詳細情報を任意で記述できます。

- `description.summary`: 一覧ホバー用の短い説明
- `description.detailed`: 詳細ダイアログ用の説明文
- `author`: `{ name, url? }`
- `homepage`: プラグインのホームページ URL
- `repository`: リポジトリ URL
- `license`: ライセンス名

例:

```json
{
  "id": "com.example.plugin",
  "name": "Example Plugin",
  "version": "1.2.3",
  "apiVersion": "1.0.0",
  "entry": "./dist/index.js",
  "capabilities": ["input-panel"],
  "description": {
    "summary": "短い説明",
    "detailed": "詳細な仕様説明..."
  },
  "author": { "name": "Author Name", "url": "https://example.com" },
  "homepage": "https://example.com/plugin",
  "repository": "https://github.com/example/plugin",
  "license": "MIT"
}
```

## 4. Renderer Plugin 型
`src/web/plugins/types.ts` の型に従って実装します。

```ts
type RendererPluginDefinition = {
  id: string;
  manifest: PluginManifestV1;
  runtime: {
    input?: {
      panel: PluginPanelSpec;
      resolveToVideoSources: (input: string, context: RendererPluginContext) => Promise<string[]> | string[];
    };
    playback?: {
      canHandle: (sourceUrl: string) => boolean;
      mount: (params: {
        video: HTMLVideoElement;
        sourceUrl: string;
        onFatalError: () => void;
      }) => void | (() => void);
    };
  };
};
```

## 5. IPC（plugin/web 向け基盤API）
プラグインから直接 Node API は使えません。必要時は次を使います。

- `window.m3u8Viewer.fs.readTextFile(path)`
- `window.m3u8Viewer.fs.writeTextFile(path, content)`
- `window.m3u8Viewer.fs.pickOpenFile(title?)`
- `window.m3u8Viewer.fs.pickDirectory(title?)`

## 6. URL登録と再生の責務
- Core 主機能: URL を登録・管理する
- 再生可否判定と再生処理: playback plugin に委譲
- `.m3u8` 再生: ビルトイン playback plugin（HLS）が担当

## 7. プラグイン一覧UIの表示ルール
- 一覧右下の `i` アイコンにホバーすると `description.summary` を表示
- リストアイテムをクリックすると詳細ダイアログを表示
  - `description.detailed`
  - author / version / capability / entry / license など

## 8. オプショナル入力プラグイン
- 入力変換プラグインは optional として提供可能
- 実装は App リポジトリ外（Plugins リポジトリ）で管理
- デフォルト無効で配布し、プラグイン一覧から有効化して利用
