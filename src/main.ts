import {
	Editor,
	MarkdownView,
	Plugin,
	WorkspaceLeaf,
	Menu,
	Notice,
} from "obsidian";
import {
	GeminiTranslateSettings,
	VIEW_TYPE_GEMINI_TRANSLATE,
	TranslationThread,
	TranslationHistoryItem,
} from "./types";
import { DEFAULT_SETTINGS, GeminiTranslateSettingTab } from "./settings";
import { GeminiTranslateView } from "./view";
import { GeminiAPI } from "./api";

export default class GeminiTranslatePlugin extends Plugin {
	settings: GeminiTranslateSettings;
	geminiAPI: GeminiAPI;

	async onload() {
		await this.loadSettings();

		// Gemini APIインスタンスを初期化
		this.geminiAPI = new GeminiAPI(this.settings);

		// ビューを登録
		this.registerView(
			VIEW_TYPE_GEMINI_TRANSLATE,
			(leaf) => new GeminiTranslateView(leaf, this)
		);

		// リボンアイコンを追加
		this.addRibbonIcon("languages", "Gemini翻訳パネルを開く", () => {
			this.activateView();
		});

		// エディタのコンテキストメニューに項目を追加
		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu: Menu, editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection) {
						menu.addItem((item) => {
							item.setTitle("Geminiで翻訳")
								.setIcon("languages")
								.onClick(async () => {
									await this.translateText(selection);
								});
						});
					}
				}
			)
		);

		// コマンドを追加（キーボードショートカット用）
		this.addCommand({
			id: "translate-selected-text",
			name: "選択したテキストを翻訳",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					await this.translateText(selection);
				} else {
					new Notice("翻訳するテキストを選択してください。");
				}
			},
		});

		// 設定タブを追加
		this.addSettingTab(new GeminiTranslateSettingTab(this.app, this));
	}

	onunload() {
		// ビューをクリーンアップ
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_GEMINI_TRANSLATE);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);

		// 既存の履歴をデフォルトスレッドに移行（後方互換性）
		if (
			this.settings.translationHistory.length > 0 &&
			this.settings.threads.length === 0
		) {
			const defaultThread = this.createNewThread("デフォルト");
			defaultThread.history = [...this.settings.translationHistory];
			this.settings.threads.push(defaultThread);
			this.settings.currentThreadId = defaultThread.id;
			this.settings.translationHistory = []; // 移行後はクリア
		}

		// スレッドが存在しない場合はデフォルトスレッドを作成
		if (this.settings.threads.length === 0) {
			const defaultThread = this.createNewThread("デフォルト");
			this.settings.threads.push(defaultThread);
			this.settings.currentThreadId = defaultThread.id;
		}

		// 現在のスレッドIDが無効な場合は最初のスレッドを選択
		if (
			!this.settings.currentThreadId ||
			!this.settings.threads.find(
				(t) => t.id === this.settings.currentThreadId
			)
		) {
			this.settings.currentThreadId = this.settings.threads[0].id;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// 設定が変更されたらAPIインスタンスも更新
		this.geminiAPI = new GeminiAPI(this.settings);
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
				await leaf.setViewState({
					type: VIEW_TYPE_GEMINI_TRANSLATE,
					active: true,
				});
			}
		}

		// ビューをアクティブにする
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	// 新しいスレッドを作成
	createNewThread(name: string): TranslationThread {
		const now = new Date().toISOString();
		return {
			id: `thread_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			name,
			createdAt: now,
			lastUpdated: now,
			history: [],
			systemPrompt: "",
		};
	}

	// スレッドを追加
	async addNewThread(name: string): Promise<string> {
		const newThread = this.createNewThread(name);
		this.settings.threads.push(newThread);
		this.settings.currentThreadId = newThread.id;
		await this.saveSettings();
		return newThread.id;
	}

	// スレッドを削除
	async deleteThread(threadId: string): Promise<boolean> {
		const threadIndex = this.settings.threads.findIndex(
			(t) => t.id === threadId
		);
		if (threadIndex === -1) return false;

		// 最後のスレッドは削除できない
		if (this.settings.threads.length === 1) {
			new Notice("最後のスレッドは削除できません。");
			return false;
		}

		this.settings.threads.splice(threadIndex, 1);

		// 削除されたスレッドが現在のスレッドだった場合、別のスレッドに切り替え
		if (this.settings.currentThreadId === threadId) {
			this.settings.currentThreadId = this.settings.threads[0].id;
		}

		await this.saveSettings();
		return true;
	}

	// スレッドを切り替え
	async switchThread(threadId: string): Promise<boolean> {
		const thread = this.settings.threads.find((t) => t.id === threadId);
		if (!thread) return false;

		this.settings.currentThreadId = threadId;
		await this.saveSettings();
		return true;
	}

	// 現在のスレッドを取得
	getCurrentThread(): TranslationThread | null {
		if (!this.settings.currentThreadId) return null;
		return (
			this.settings.threads.find(
				(t) => t.id === this.settings.currentThreadId
			) || null
		);
	}

	// スレッドに翻訳を追加
	async addTranslationToCurrentThread(
		originalText: string,
		translatedText: string
	): Promise<void> {
		const currentThread = this.getCurrentThread();
		if (!currentThread) return;

		const historyItem: TranslationHistoryItem = {
			timestamp: new Date().toLocaleString(),
			originalText,
			translatedText,
		};

		currentThread.history.push(historyItem);
		currentThread.lastUpdated = new Date().toISOString();
		await this.saveSettings();
	}

	// テキストを翻訳
	async translateText(text: string) {
		if (!this.settings.apiKey) {
			new Notice(
				"APIキーが設定されていません。設定画面でAPIキーを入力してください。"
			);
			return;
		}

		// ビューを開く
		await this.activateView();

		// ビューを取得
		const leaves = this.app.workspace.getLeavesOfType(
			VIEW_TYPE_GEMINI_TRANSLATE
		);
		if (leaves.length === 0) return;

		const view = leaves[0].view as GeminiTranslateView;
		view.showLoading();

		try {
			// 現在のスレッドのシステムプロンプトを取得
			const currentThread = this.getCurrentThread();
			const threadSystemPrompt = currentThread?.systemPrompt || "";

			const translatedText = await this.geminiAPI.translateText(
				text,
				threadSystemPrompt
			);
			view.hideLoading();
			view.displayTranslation(text, translatedText);

			// 現在のスレッドに翻訳を追加
			await this.addTranslationToCurrentThread(text, translatedText);
		} catch (error) {
			console.error("Translation error:", error);
			view.hideLoading();
			view.displayError(error.message);
			new Notice(`翻訳エラー: ${error.message}`);
		}
	}
}
