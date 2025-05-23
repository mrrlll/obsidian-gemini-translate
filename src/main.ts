import { App, Editor, MarkdownView, Plugin, WorkspaceLeaf, Menu, Notice } from 'obsidian';
import { GeminiTranslateSettings, VIEW_TYPE_GEMINI_TRANSLATE } from './types';
import { DEFAULT_SETTINGS, GeminiTranslateSettingTab } from './settings';
import { GeminiTranslateView } from './view';
import { GeminiAPI } from './api';

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

		// コマンドを追加（キーボードショートカット用）
		this.addCommand({
			id: 'translate-selected-text',
			name: '選択したテキストを翻訳',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					await this.translateText(selection);
				} else {
					new Notice("翻訳するテキストを選択してください。");
				}
			}
		});

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
			const translatedText = await this.geminiAPI.translateText(text);
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