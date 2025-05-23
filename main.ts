import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, Menu, Notice } from 'obsidian';

// 翻訳履歴のインターフェース
interface TranslationHistoryItem {
	timestamp: string;
	originalText: string;
	translatedText: string;
}

// Gemini APIの設定インターフェース
interface GeminiTranslateSettings {
	apiKey: string;
	model: string;
	targetLanguage: string;
	translationHistory: TranslationHistoryItem[];
}

const DEFAULT_SETTINGS: GeminiTranslateSettings = {
	apiKey: '',
	model: 'gemini-pro',
	targetLanguage: '日本語',
	translationHistory: []
}

// 翻訳結果を表示するビュー
const VIEW_TYPE_GEMINI_TRANSLATE = "gemini-translate-view";

class GeminiTranslateView extends ItemView {
	plugin: GeminiTranslatePlugin;
	contentEl: HTMLElement;
	translationHistory: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: GeminiTranslatePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_GEMINI_TRANSLATE;
	}

	getDisplayText() {
		return "Gemini翻訳";
	}

	getIcon() {
		return "languages";
	}

	async onOpen() {
		this.contentEl = this.containerEl.children[1] as HTMLElement;
		this.contentEl.empty();
		
		// ヘッダーを追加
		const headerEl = this.contentEl.createEl("div", { cls: "gemini-translate-header" });
		headerEl.createEl("h4", { text: "Gemini翻訳" });
		
		// クリアボタンを追加
		const clearButton = headerEl.createEl("button", {
			text: "履歴をクリア",
			cls: "gemini-translate-clear-button"
		});
		clearButton.addEventListener("click", () => {
			this.clearHistory();
		});
		
		// 入力エリアを追加
		const inputArea = this.contentEl.createEl("div", { cls: "gemini-translate-input-area" });
		
		// テキスト入力欄
		const textArea = inputArea.createEl("textarea", {
			cls: "gemini-translate-input",
			attr: {
				placeholder: "翻訳したいテキストを入力してください...",
				rows: "3"
			}
		});
		
		// 翻訳ボタン
		const translateButton = inputArea.createEl("button", {
			text: "翻訳",
			cls: "gemini-translate-button"
		});
		translateButton.addEventListener("click", async () => {
			const text = textArea.value.trim();
			if (text) {
				await this.plugin.translateText(text);
				textArea.value = "";
			}
		});
		
		// Enterキーで翻訳（Shift+Enterで改行）
		textArea.addEventListener("keydown", async (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				const text = textArea.value.trim();
				if (text) {
					await this.plugin.translateText(text);
					textArea.value = "";
				}
			}
		});
		
		// コンテンツエリアを追加
		const contentArea = this.contentEl.createEl("div", { cls: "gemini-translate-content" });
		
		// 翻訳履歴エリアを追加
		this.translationHistory = contentArea.createEl("div", { cls: "gemini-translate-history" });
		
		// 保存された履歴を読み込む
		await this.loadHistory();
	}

	async onClose() {
		// ビューが閉じられたときのクリーンアップ
	}

	// 翻訳結果を表示（新しいものを下に追加）
	async displayTranslation(originalText: string, translatedText: string) {
		// 初期メッセージがあれば削除
		const initialMessage = this.translationHistory.querySelector(".initial-message");
		if (initialMessage) {
			initialMessage.remove();
		}
		
		// 新しい翻訳結果を作成
		const translationItem = this.translationHistory.createEl("div", { cls: "translation-item" });
		
		// タイムスタンプを追加
		const timestamp = new Date().toLocaleString();
		const timestampEl = translationItem.createEl("div", { cls: "translation-timestamp" });
		timestampEl.createEl("span", { text: timestamp });
		
		// 元のテキスト
		const originalSection = translationItem.createEl("div", { cls: "translation-section" });
		originalSection.createEl("h5", { text: "原文:" });
		const originalTextEl = originalSection.createEl("div", {
			text: originalText,
			cls: "original-text user-select"
		});
		
		// 翻訳結果
		const translatedSection = translationItem.createEl("div", { cls: "translation-section" });
		translatedSection.createEl("h5", { text: "翻訳:" });
		const translatedTextEl = translatedSection.createEl("div", {
			text: translatedText,
			cls: "translated-text user-select"
		});
		
		// 区切り線を追加
		translationItem.createEl("hr", { cls: "translation-separator" });
		
		// 最新の翻訳を一番下に追加
		this.translationHistory.appendChild(translationItem);
		
		// スクロールを一番下に
		const contentArea = this.contentEl.querySelector(".gemini-translate-content");
		if (contentArea) {
			contentArea.scrollTop = contentArea.scrollHeight;
		}
		
		// 履歴を保存
		await this.saveTranslationToHistory(originalText, translatedText, timestamp);
	}

	// エラーを表示
	displayError(error: string) {
		// 初期メッセージがあれば削除
		const initialMessage = this.translationHistory.querySelector(".initial-message");
		if (initialMessage) {
			initialMessage.remove();
		}
		
		// エラーメッセージを作成
		const errorItem = this.translationHistory.createEl("div", { cls: "translation-item error-item" });
		
		// タイムスタンプを追加
		const timestamp = new Date().toLocaleString();
		const timestampEl = errorItem.createEl("div", { cls: "translation-timestamp" });
		timestampEl.createEl("span", { text: timestamp });
		
		errorItem.createEl("p", { text: `エラー: ${error}`, cls: "error-message" });
		
		// 区切り線を追加
		errorItem.createEl("hr", { cls: "translation-separator" });
		
		// 最新のエラーを一番下に表示
		this.translationHistory.appendChild(errorItem);
		
		// スクロールを一番下に
		const contentArea = this.contentEl.querySelector(".gemini-translate-content");
		if (contentArea) {
			contentArea.scrollTop = contentArea.scrollHeight;
		}
	}

	// ローディング表示
	showLoading() {
		// ローディングインジケーターを一番下に追加
		const loadingEl = this.translationHistory.createEl("div", { cls: "loading-indicator" });
		loadingEl.createEl("p", { text: "翻訳中...", cls: "loading-message" });
		this.translationHistory.appendChild(loadingEl);
		
		// スクロールを一番下に
		const contentArea = this.contentEl.querySelector(".gemini-translate-content");
		if (contentArea) {
			contentArea.scrollTop = contentArea.scrollHeight;
		}
	}
	
	// ローディング表示を削除
	hideLoading() {
		const loadingEl = this.translationHistory.querySelector(".loading-indicator");
		if (loadingEl) {
			loadingEl.remove();
		}
	}
	
	// 履歴をクリア
	async clearHistory() {
		this.translationHistory.empty();
		const initialMessage = this.translationHistory.createEl("div", { cls: "initial-message" });
		initialMessage.createEl("p", { text: "テキストを入力して翻訳ボタンを押すか、テキストを選択して右クリックメニューから「Geminiで翻訳」を選択してください。" });
		
		// 保存された履歴もクリア
		this.plugin.settings.translationHistory = [];
		await this.plugin.saveSettings();
	}
	
	// 履歴を保存
	async saveTranslationToHistory(originalText: string, translatedText: string, timestamp: string) {
		const historyItem: TranslationHistoryItem = {
			timestamp,
			originalText,
			translatedText
		};
		
		this.plugin.settings.translationHistory.push(historyItem);
		await this.plugin.saveSettings();
	}
	
	// 履歴を読み込む
	async loadHistory() {
		const history = this.plugin.settings.translationHistory;
		
		if (history.length === 0) {
			// 初期メッセージ
			const initialMessage = this.translationHistory.createEl("div", { cls: "initial-message" });
			initialMessage.createEl("p", { text: "テキストを入力して翻訳ボタンを押すか、テキストを選択して右クリックメニューから「Geminiで翻訳」を選択してください。" });
			return;
		}
		
		// 履歴を表示
		for (const item of history) {
			const translationItem = this.translationHistory.createEl("div", { cls: "translation-item" });
			
			// タイムスタンプ
			const timestampEl = translationItem.createEl("div", { cls: "translation-timestamp" });
			timestampEl.createEl("span", { text: item.timestamp });
			
			// 元のテキスト
			const originalSection = translationItem.createEl("div", { cls: "translation-section" });
			originalSection.createEl("h5", { text: "原文:" });
			originalSection.createEl("div", {
				text: item.originalText,
				cls: "original-text user-select"
			});
			
			// 翻訳結果
			const translatedSection = translationItem.createEl("div", { cls: "translation-section" });
			translatedSection.createEl("h5", { text: "翻訳:" });
			translatedSection.createEl("div", {
				text: item.translatedText,
				cls: "translated-text user-select"
			});
			
			// 区切り線
			translationItem.createEl("hr", { cls: "translation-separator" });
		}
	}
}

export default class GeminiTranslatePlugin extends Plugin {
	settings: GeminiTranslateSettings;

	async onload() {
		await this.loadSettings();

		// ビューを登録
		this.registerView(
			VIEW_TYPE_GEMINI_TRANSLATE,
			(leaf) => new GeminiTranslateView(leaf, this)
		);

		// リボンアイコンを追加
		this.addRibbonIcon('languages', 'Gemini翻訳パネルを開く', () => {
			this.activateView();
		});

		// エディタのコンテキストメニューに項目を追加
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					menu.addItem((item) => {
						item
							.setTitle("Geminiで翻訳")
							.setIcon("languages")
							.onClick(async () => {
								await this.translateText(selection);
							});
					});
				}
			})
		);

		// 設定タブを追加
		this.addSettingTab(new GeminiTranslateSettingTab(this.app, this));
	}

	onunload() {
		// ビューをクリーンアップ
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_GEMINI_TRANSLATE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// ビューをアクティブにする
	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_GEMINI_TRANSLATE);

		if (leaves.length > 0) {
			// 既存のビューがある場合はそれを表示
			leaf = leaves[0];
		} else {
			// 新しいビューを右サイドバーに作成
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_GEMINI_TRANSLATE, active: true });
			}
		}

		// ビューをアクティブにする
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	// テキストを翻訳
	async translateText(text: string) {
		if (!this.settings.apiKey) {
			new Notice("APIキーが設定されていません。設定画面でAPIキーを入力してください。");
			return;
		}

		// ビューを開く
		await this.activateView();
		
		// ビューを取得
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GEMINI_TRANSLATE);
		if (leaves.length === 0) return;
		
		const view = leaves[0].view as GeminiTranslateView;
		view.showLoading();

		try {
			const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.settings.model}:generateContent?key=${this.settings.apiKey}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					contents: [{
						parts: [{
							text: `次のテキストを${this.settings.targetLanguage}に翻訳してください。翻訳のみを返してください。～～だ。～～である。といった文体で翻訳を行ってください。\n\nテキスト: ${text}`
						}]
					}]
				})
			});

			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`);
			}

			const data = await response.json();
			const translatedText = data.candidates[0].content.parts[0].text;
			
			view.hideLoading();
			view.displayTranslation(text, translatedText);
		} catch (error) {
			console.error('Translation error:', error);
			view.hideLoading();
			view.displayError(error.message);
			new Notice(`翻訳エラー: ${error.message}`);
		}
	}
}

// 設定タブ
class GeminiTranslateSettingTab extends PluginSettingTab {
	plugin: GeminiTranslatePlugin;

	constructor(app: App, plugin: GeminiTranslatePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Gemini翻訳設定'});

		// APIキー設定
		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Google AI StudioからAPIキーを取得してください')
			.addText(text => text
				.setPlaceholder('APIキーを入力')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		// モデル選択
		new Setting(containerEl)
			.setName('モデル')
			.setDesc('使用するGeminiモデルを選択')
			.addDropdown(dropdown => dropdown
				.addOption('gemini-2.0-flash', 'Gemini 2.0 Flash')
				.addOption('gemini-2.5-flash-preview-05-20', 'Gemini 2.5 Flash Preview 05-20')
				.addOption('gemini-2.5-pro-preview-05-06', 'Gemini 2.5 Pro Preview 05-06')
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		// ターゲット言語
		new Setting(containerEl)
			.setName('翻訳先言語')
			.setDesc('翻訳先の言語を指定')
			.addText(text => text
				.setPlaceholder('例: 日本語')
				.setValue(this.plugin.settings.targetLanguage)
				.onChange(async (value) => {
					this.plugin.settings.targetLanguage = value;
					await this.plugin.saveSettings();
				}));
	}
}
