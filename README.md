# Obsidian Gemini Translate Plugin

このプラグインは、選択したテキストをGoogle Gemini APIを使用して日本語（または指定した言語）に翻訳するObsidianプラグインです。

## 機能

- 📝 選択したテキストを右クリックメニューから簡単に翻訳
- 🎯 サイドパネルに翻訳結果を表示
- ⚙️ 設定画面でGeminiモデルと翻訳先言語を選択可能
- 🚀 高速で正確な翻訳

## インストール方法

### 手動インストール

1. このリポジトリから最新のリリースをダウンロード
2. Obsidianのプラグインフォルダ（`.obsidian/plugins/`）に`obsidian-gemini-translate`フォルダを作成
3. `main.js`、`manifest.json`、`styles.css`をそのフォルダにコピー
4. Obsidianを再起動し、設定→コミュニティプラグインでプラグインを有効化

## 使い方

### 初期設定

1. 設定→コミュニティプラグイン→Gemini Translateの設定を開く
2. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキーを取得
3. 取得したAPIキーを設定画面に入力
4. 使用するモデルと翻訳先言語を選択

### 翻訳方法

1. 翻訳したいテキストを選択
2. 右クリックして「Geminiで翻訳」を選択
3. サイドパネルに翻訳結果が表示されます

または、左サイドバーのリボンアイコンをクリックして翻訳パネルを開くこともできます。

## 設定オプション

- **Gemini API Key**: Google AI StudioのAPIキー
- **モデル**: 使用するGeminiモデル
  - Gemini Pro（標準）
  - Gemini 1.5 Pro（高性能）
  - Gemini 1.5 Flash（高速）
- **翻訳先言語**: 翻訳先の言語（デフォルト: 日本語）

## 開発

### 必要な環境

- Node.js 16以上
- npm

### ビルド方法

```bash
# 依存関係のインストール
npm install

# 開発モードでビルド（ファイル変更を監視）
npm run dev

# プロダクションビルド
npm run build
```

## ライセンス

MIT License

## サポート

問題や提案がある場合は、GitHubのIssuesでお知らせください。
