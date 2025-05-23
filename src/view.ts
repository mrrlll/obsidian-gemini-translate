import { ItemView, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_GEMINI_TRANSLATE, TranslationHistoryItem } from './types';

export class GeminiTranslateView extends ItemView {
	plugin: any; // 循環参照を避けるためanyを使用
	contentEl: HTMLElement;
	translationHistory: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: any) {
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