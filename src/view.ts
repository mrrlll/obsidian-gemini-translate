import { ItemView, WorkspaceLeaf, Modal, App, Setting } from "obsidian";
import { VIEW_TYPE_GEMINI_TRANSLATE, TranslationThread } from "./types";

// スレッド名入力用のモーダル
class ThreadNameModal extends Modal {
	private onSubmit: (name: string) => void;
	private defaultName: string;

	constructor(app: App, onSubmit: (name: string) => void, defaultName = "") {
		super(app);
		this.onSubmit = onSubmit;
		this.defaultName = defaultName;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "新しいスレッドを作成" });

		let nameInput: HTMLInputElement;

		new Setting(contentEl)
			.setName("スレッド名")
			.setDesc("新しいスレッドの名前を入力してください")
			.addText((text) => {
				nameInput = text.inputEl;
				text.setPlaceholder("スレッド名")
					.setValue(this.defaultName)
					.onChange((value) => {
						// リアルタイムでの変更処理は不要
					});

				// Enterキーで送信
				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						this.submit(nameInput.value);
					}
				});
			});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("作成")
					.setCta()
					.onClick(() => {
						this.submit(nameInput.value);
					})
			)
			.addButton((btn) =>
				btn.setButtonText("キャンセル").onClick(() => {
					this.close();
				})
			);

		// 入力フィールドにフォーカス
		setTimeout(() => {
			nameInput.focus();
			nameInput.select();
		}, 100);
	}

	private submit(name: string) {
		if (name && name.trim()) {
			this.onSubmit(name.trim());
			this.close();
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// スレッド削除確認用のモーダル
class ConfirmDeleteModal extends Modal {
	private onConfirm: () => void;
	private threadName: string;

	constructor(app: App, threadName: string, onConfirm: () => void) {
		super(app);
		this.threadName = threadName;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "スレッドを削除" });

		contentEl.createEl("p", {
			text: `スレッド「${this.threadName}」を削除しますか？この操作は取り消せません。`,
		});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("削除")
					.setWarning()
					.onClick(() => {
						this.onConfirm();
						this.close();
					})
			)
			.addButton((btn) =>
				btn.setButtonText("キャンセル").onClick(() => {
					this.close();
				})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 履歴クリア確認用のモーダル
class ConfirmClearModal extends Modal {
	private onConfirm: () => void;
	private threadName: string;

	constructor(app: App, threadName: string, onConfirm: () => void) {
		super(app);
		this.threadName = threadName;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "履歴をクリア" });

		contentEl.createEl("p", {
			text: `スレッド「${this.threadName}」の履歴をクリアしますか？この操作は取り消せません。`,
		});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("クリア")
					.setWarning()
					.onClick(() => {
						this.onConfirm();
						this.close();
					})
			)
			.addButton((btn) =>
				btn.setButtonText("キャンセル").onClick(() => {
					this.close();
				})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// システムプロンプト設定用のモーダル
class SystemPromptModal extends Modal {
	private onSubmitGlobal: (prompt: string) => void;
	private onSubmitThread: (prompt: string) => void;
	private globalPrompt: string;
	private threadPrompt: string;
	private threadName: string;
	private plugin: any;

	constructor(
		app: App,
		plugin: any,
		onSubmitGlobal: (prompt: string) => void,
		onSubmitThread: (prompt: string) => void,
		globalPrompt = "",
		threadPrompt = "",
		threadName: string
	) {
		super(app);
		this.plugin = plugin;
		this.onSubmitGlobal = onSubmitGlobal;
		this.onSubmitThread = onSubmitThread;
		this.globalPrompt = globalPrompt;
		this.threadPrompt = threadPrompt;
		this.threadName = threadName;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "システムプロンプト設定" });

		contentEl.createEl("p", {
			text: "グローバル設定はすべてのスレッドに適用され、スレッド設定は現在のスレッドにのみ適用されます。",
		});

		// グローバルシステムプロンプト設定
		contentEl.createEl("h4", { text: "グローバルシステムプロンプト" });
		contentEl.createEl("p", {
			text: "すべてのスレッドに適用される基本的な翻訳指示を設定します。",
			cls: "setting-item-description",
		});

		let globalPromptTextArea: HTMLTextAreaElement;

		new Setting(contentEl)
			.setName("グローバル設定")
			.setDesc("すべてのスレッドで使用される基本的な翻訳指示")
			.addTextArea((text) => {
				globalPromptTextArea = text.inputEl;
				text.setPlaceholder(
					"例: 自然で読みやすい翻訳を心がけてください。専門用語は適切に翻訳し、文脈に応じて説明を加えてください。"
				)
					.setValue(this.globalPrompt)
					.onChange((value) => {
						// リアルタイムでの変更処理は不要
					});

				// テキストエリアのサイズを調整
				text.inputEl.rows = 4;
				text.inputEl.style.width = "100%";
			});

		// スレッド固有システムプロンプト設定
		contentEl.createEl("h4", {
			text: `スレッド「${this.threadName}」専用設定`,
		});
		contentEl.createEl("p", {
			text: "このスレッドにのみ適用される追加の翻訳指示を設定します。グローバル設定と組み合わせて使用されます。",
			cls: "setting-item-description",
		});

		let threadPromptTextArea: HTMLTextAreaElement;

		new Setting(contentEl)
			.setName("スレッド専用設定")
			.setDesc("このスレッドにのみ適用される追加の翻訳指示")
			.addTextArea((text) => {
				threadPromptTextArea = text.inputEl;
				text.setPlaceholder(
					"例: 技術文書として翻訳してください。コードやAPIの名前は英語のまま残してください。"
				)
					.setValue(this.threadPrompt)
					.onChange((value) => {
						// リアルタイムでの変更処理は不要
					});

				// テキストエリアのサイズを調整
				text.inputEl.rows = 4;
				text.inputEl.style.width = "100%";
			});

		// ボタン
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("保存")
					.setCta()
					.onClick(() => {
						this.submit(
							globalPromptTextArea.value,
							threadPromptTextArea.value
						);
					})
			)
			.addButton((btn) =>
				btn.setButtonText("キャンセル").onClick(() => {
					this.close();
				})
			);

		// 最初のテキストエリアにフォーカス
		setTimeout(() => {
			globalPromptTextArea.focus();
		}, 100);
	}

	private submit(globalPrompt: string, threadPrompt: string) {
		this.onSubmitGlobal(globalPrompt);
		this.onSubmitThread(threadPrompt);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class GeminiTranslateView extends ItemView {
	plugin: any; // 循環参照を避けるためanyを使用
	contentEl: HTMLElement;
	translationHistory: HTMLElement;
	threadSelector: HTMLSelectElement;
	threadControls: HTMLElement;

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

		// メインコンテナを作成してフレックスレイアウトを適用
		const mainContainer = this.contentEl.createEl("div", {
			cls: "gemini-translate-view",
		});

		// ヘッダーを追加（スレッド管理を統合）
		const headerEl = mainContainer.createEl("div", {
			cls: "gemini-translate-header",
		});

		// タイトル部分
		const titleSection = headerEl.createEl("div", {
			cls: "header-title-section",
		});
		titleSection.createEl("h4", { text: "Gemini翻訳" });

		// スレッド管理部分をヘッダーに統合
		this.threadControls = headerEl.createEl("div", {
			cls: "header-thread-controls",
		});

		// スレッド選択ドロップダウン（コンパクト版）
		const threadSelectorContainer = this.threadControls.createEl("div", {
			cls: "header-thread-selector-container",
		});
		this.threadSelector = threadSelectorContainer.createEl("select", {
			cls: "header-thread-selector",
		});
		this.threadSelector.addEventListener("change", async () => {
			await this.switchThread(this.threadSelector.value);
		});

		// スレッド操作ボタン（アイコンボタン）
		const threadButtonsContainer = this.threadControls.createEl("div", {
			cls: "header-thread-buttons",
		});

		// 新しいスレッドボタン
		const newThreadButton = threadButtonsContainer.createEl("button", {
			text: "+",
			cls: "header-thread-button",
			attr: { title: "新しいスレッド" },
		});
		newThreadButton.addEventListener("click", () => {
			this.createNewThread();
		});

		// スレッド削除ボタン
		const deleteThreadButton = threadButtonsContainer.createEl("button", {
			text: "×",
			cls: "header-thread-button delete-button",
			attr: { title: "スレッドを削除" },
		});
		deleteThreadButton.addEventListener("click", () => {
			this.deleteCurrentThread();
		});

		// クリアボタンを追加
		const clearButton = threadButtonsContainer.createEl("button", {
			text: "⌫",
			cls: "header-thread-button",
			attr: { title: "履歴をクリア" },
		});
		clearButton.addEventListener("click", () => {
			this.clearHistory();
		});

		// システムプロンプト設定ボタンを追加
		const systemPromptButton = threadButtonsContainer.createEl("button", {
			text: "⚙",
			cls: "header-thread-button",
			attr: { title: "システムプロンプト設定" },
		});
		systemPromptButton.addEventListener("click", () => {
			this.openSystemPromptSettings();
		});

		// 入力エリアを追加
		const inputArea = mainContainer.createEl("div", {
			cls: "gemini-translate-input-area",
		});

		// 入力エリアのヘッダー（折り畳みボタン付き）
		const inputHeader = inputArea.createEl("div", {
			cls: "input-area-header",
		});

		inputHeader.createEl("h5", { text: "テキスト入力" });

		const toggleButton = inputHeader.createEl("button", {
			text: "−",
			cls: "input-toggle-button",
			attr: { title: "入力エリアを折り畳む" },
		});

		// 入力コンテンツ部分
		const inputContent = inputArea.createEl("div", {
			cls: "input-content",
		});

		// テキスト入力欄
		const textArea = inputContent.createEl("textarea", {
			cls: "gemini-translate-input",
			attr: {
				placeholder: "翻訳したいテキストを入力してください...",
				rows: "3",
				spellcheck: "false",
			},
		}) as HTMLTextAreaElement;

		// テキストエリアのフォーカスを確実にする
		textArea.addEventListener("click", () => {
			textArea.focus();
		});

		// 翻訳ボタン
		const translateButton = inputContent.createEl("button", {
			text: "翻訳",
			cls: "gemini-translate-button",
		});

		// 折り畳み機能の実装
		let isCollapsed = false;
		toggleButton.addEventListener("click", () => {
			isCollapsed = !isCollapsed;
			if (isCollapsed) {
				inputContent.addClass("collapsed");
				inputArea.addClass("collapsed");
				toggleButton.textContent = "+";
				toggleButton.setAttribute("title", "入力エリアを展開する");
			} else {
				inputContent.removeClass("collapsed");
				inputArea.removeClass("collapsed");
				toggleButton.textContent = "−";
				toggleButton.setAttribute("title", "入力エリアを折り畳む");
			}
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
		const contentArea = mainContainer.createEl("div", {
			cls: "gemini-translate-content",
		});

		// 翻訳履歴エリアを追加
		this.translationHistory = contentArea.createEl("div", {
			cls: "gemini-translate-history",
		});

		// スレッド選択肢を更新
		this.updateThreadSelector();

		// 保存された履歴を読み込む
		await this.loadHistory();
	}

	async onClose() {
		// ビューが閉じられたときのクリーンアップ
	}

	// 翻訳結果を表示（新しいものを下に追加）
	async displayTranslation(originalText: string, translatedText: string) {
		// 初期メッセージがあれば削除
		const initialMessage =
			this.translationHistory.querySelector(".initial-message");
		if (initialMessage) {
			initialMessage.remove();
		}

		// 新しい翻訳結果を作成
		const translationItem = this.translationHistory.createEl("div", {
			cls: "translation-item",
		});

		// タイムスタンプを追加
		const timestamp = new Date().toLocaleString();
		const timestampEl = translationItem.createEl("div", {
			cls: "translation-timestamp",
		});
		timestampEl.createEl("span", { text: timestamp });

		// 元のテキスト
		const originalSection = translationItem.createEl("div", {
			cls: "translation-section",
		});
		originalSection.createEl("h5", { text: "原文:" });
		originalSection.createEl("div", {
			text: originalText,
			cls: "original-text user-select",
		});

		// 翻訳結果
		const translatedSection = translationItem.createEl("div", {
			cls: "translation-section",
		});
		translatedSection.createEl("h5", { text: "翻訳:" });
		translatedSection.createEl("div", {
			text: translatedText,
			cls: "translated-text user-select",
		});

		// 区切り線を追加
		translationItem.createEl("hr", { cls: "translation-separator" });

		// 最新の翻訳を一番下に追加
		this.translationHistory.appendChild(translationItem);

		// スクロールを一番下に
		const contentArea = this.contentEl.querySelector(
			".gemini-translate-content"
		);
		if (contentArea) {
			contentArea.scrollTop = contentArea.scrollHeight;
		}
	}

	// エラーを表示
	displayError(error: string) {
		// 初期メッセージがあれば削除
		const initialMessage =
			this.translationHistory.querySelector(".initial-message");
		if (initialMessage) {
			initialMessage.remove();
		}

		// エラーメッセージを作成
		const errorItem = this.translationHistory.createEl("div", {
			cls: "translation-item error-item",
		});

		// タイムスタンプを追加
		const timestamp = new Date().toLocaleString();
		const timestampEl = errorItem.createEl("div", {
			cls: "translation-timestamp",
		});
		timestampEl.createEl("span", { text: timestamp });

		errorItem.createEl("p", {
			text: `エラー: ${error}`,
			cls: "error-message",
		});

		// 区切り線を追加
		errorItem.createEl("hr", { cls: "translation-separator" });

		// 最新のエラーを一番下に表示
		this.translationHistory.appendChild(errorItem);

		// スクロールを一番下に
		const contentArea = this.contentEl.querySelector(
			".gemini-translate-content"
		);
		if (contentArea) {
			contentArea.scrollTop = contentArea.scrollHeight;
		}
	}

	// ローディング表示
	showLoading() {
		// ローディングインジケーターを一番下に追加
		const loadingEl = this.translationHistory.createEl("div", {
			cls: "loading-indicator",
		});
		loadingEl.createEl("p", { text: "翻訳中...", cls: "loading-message" });
		this.translationHistory.appendChild(loadingEl);

		// スクロールを一番下に
		const contentArea = this.contentEl.querySelector(
			".gemini-translate-content"
		);
		if (contentArea) {
			contentArea.scrollTop = contentArea.scrollHeight;
		}
	}

	// ローディング表示を削除
	hideLoading() {
		const loadingEl =
			this.translationHistory.querySelector(".loading-indicator");
		if (loadingEl) {
			loadingEl.remove();
		}
	}

	// スレッド選択肢を更新
	updateThreadSelector() {
		this.threadSelector.empty();

		const threads = this.plugin.settings.threads;
		const currentThreadId = this.plugin.settings.currentThreadId;

		threads.forEach((thread: TranslationThread) => {
			const option = this.threadSelector.createEl("option", {
				value: thread.id,
				text: thread.name,
			});
			if (thread.id === currentThreadId) {
				option.selected = true;
			}
		});
	}

	// スレッドを切り替え
	async switchThread(threadId: string) {
		const success = await this.plugin.switchThread(threadId);
		if (success) {
			await this.loadHistory();
		}
	}

	// 新しいスレッドを作成
	async createNewThread() {
		// モーダルダイアログを作成してスレッド名を入力
		const modal = new ThreadNameModal(
			this.app,
			async (name: string) => {
				if (name && name.trim()) {
					await this.plugin.addNewThread(name.trim());
					this.updateThreadSelector();
					await this.loadHistory();
				}
			},
			`スレッド ${this.plugin.settings.threads.length + 1}`
		);
		modal.open();
	}

	// 現在のスレッドを削除
	async deleteCurrentThread() {
		const currentThread = this.plugin.getCurrentThread();
		if (!currentThread) return;

		const modal = new ConfirmDeleteModal(
			this.app,
			currentThread.name,
			async () => {
				const success = await this.plugin.deleteThread(
					currentThread.id
				);
				if (success) {
					this.updateThreadSelector();
					await this.loadHistory();
				}
			}
		);
		modal.open();
	}

	// 履歴を読み込む（現在のスレッドから）
	async loadHistory() {
		this.translationHistory.empty();

		const currentThread = this.plugin.getCurrentThread();
		if (!currentThread || currentThread.history.length === 0) {
			// 初期メッセージ
			const initialMessage = this.translationHistory.createEl("div", {
				cls: "initial-message",
			});
			initialMessage.createEl("p", {
				text: "テキストを入力して翻訳ボタンを押すか、テキストを選択して右クリックメニューから「Geminiで翻訳」を選択してください。設定から選択中のテキストを翻訳するショートカットキーを設定することもできます。",
			});
			return;
		}

		// 履歴を表示
		for (const item of currentThread.history) {
			const translationItem = this.translationHistory.createEl("div", {
				cls: "translation-item",
			});

			// タイムスタンプ
			const timestampEl = translationItem.createEl("div", {
				cls: "translation-timestamp",
			});
			timestampEl.createEl("span", { text: item.timestamp });

			// 元のテキスト
			const originalSection = translationItem.createEl("div", {
				cls: "translation-section",
			});
			originalSection.createEl("h5", { text: "原文:" });
			originalSection.createEl("div", {
				text: item.originalText,
				cls: "original-text user-select",
			});

			// 翻訳結果
			const translatedSection = translationItem.createEl("div", {
				cls: "translation-section",
			});
			translatedSection.createEl("h5", { text: "翻訳:" });
			translatedSection.createEl("div", {
				text: item.translatedText,
				cls: "translated-text user-select",
			});

			// 区切り線
			translationItem.createEl("hr", { cls: "translation-separator" });
		}
	}

	// 履歴をクリア（現在のスレッドのみ）
	async clearHistory() {
		const currentThread = this.plugin.getCurrentThread();
		if (!currentThread) return;

		const modal = new ConfirmClearModal(
			this.app,
			currentThread.name,
			async () => {
				currentThread.history = [];
				await this.plugin.saveSettings();
				await this.loadHistory();
			}
		);
		modal.open();
	}

	// システムプロンプト設定を開く
	openSystemPromptSettings() {
		const currentThread = this.plugin.getCurrentThread();
		if (!currentThread) return;

		// グローバルとスレッド固有のシステムプロンプト設定モーダルを開く
		const modal = new SystemPromptModal(
			this.app,
			this.plugin,
			async (globalPrompt: string) => {
				// グローバルシステムプロンプトを保存
				this.plugin.settings.globalSystemPrompt = globalPrompt;
				await this.plugin.saveSettings();
			},
			async (threadPrompt: string) => {
				// スレッド固有のシステムプロンプトを保存
				currentThread.systemPrompt = threadPrompt;
				await this.plugin.saveSettings();
			},
			this.plugin.settings.globalSystemPrompt || "",
			currentThread.systemPrompt || "",
			currentThread.name
		);
		modal.open();
	}
}
