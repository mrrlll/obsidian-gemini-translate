import { App, PluginSettingTab, Setting } from 'obsidian';
import { GeminiTranslateSettings } from './types';

export const DEFAULT_SETTINGS: GeminiTranslateSettings = {
	apiKey: '',
	model: 'gemini-pro',
	targetLanguage: '日本語',
	translationHistory: []
}

// 設定タブ
export class GeminiTranslateSettingTab extends PluginSettingTab {
	plugin: any; // 循環参照を避けるためanyを使用

	constructor(app: App, plugin: any) {
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