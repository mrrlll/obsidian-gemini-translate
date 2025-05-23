# Obsidian Gemini Translate Plugin - ファイル構造

このプラグインは、メンテナンス性を向上させるために以下のようにファイルが分割されています。

## ファイル構造

```
src/
├── types.ts      - 型定義とインターフェース
├── api.ts        - Gemini API関連の処理
├── view.ts       - 翻訳ビューのクラス
├── settings.ts   - 設定タブとデフォルト設定
└── main.ts       - メインプラグインクラス（未使用）
main.ts           - エントリーポイント（分割されたファイルをインポート）
```

## 各ファイルの役割

### `src/types.ts`
- `TranslationHistoryItem`: 翻訳履歴のアイテム型
- `GeminiTranslateSettings`: プラグイン設定の型
- `VIEW_TYPE_GEMINI_TRANSLATE`: ビュータイプの定数

### `src/api.ts`
- `GeminiAPI`: Gemini APIとの通信を担当するクラス
- 翻訳リクエストの処理とエラーハンドリング

### `src/view.ts`
- `GeminiTranslateView`: 翻訳結果を表示するビュークラス
- UI要素の作成と管理
- 翻訳履歴の表示と管理

### `src/settings.ts`
- `DEFAULT_SETTINGS`: デフォルト設定値
- `GeminiTranslateSettingTab`: 設定画面のクラス

### `main.ts`（ルート）
- `GeminiTranslatePlugin`: メインプラグインクラス
- 各モジュールを統合してプラグインとして動作

## メリット

1. **責任の分離**: 各ファイルが明確な役割を持つ
2. **再利用性**: 各クラスが独立しており、テストや再利用が容易
3. **保守性**: 機能ごとにファイルが分かれているため、修正箇所が特定しやすい
4. **拡張性**: 新機能の追加時に適切なファイルに追加できる

## 注意事項

現在、TypeScriptの型エラーが表示されていますが、これはObsidianの型定義が開発環境で見つからないことが原因です。実際のObsidian環境では正常に動作します。