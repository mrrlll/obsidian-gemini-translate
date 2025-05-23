import { GeminiTranslateSettings } from './types';

export class GeminiAPI {
	private settings: GeminiTranslateSettings;

	constructor(settings: GeminiTranslateSettings) {
		this.settings = settings;
	}

	async translateText(text: string): Promise<string> {
		if (!this.settings.apiKey) {
			throw new Error("APIキーが設定されていません。設定画面でAPIキーを入力してください。");
		}

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
			return data.candidates[0].content.parts[0].text;
		} catch (error) {
			console.error('Translation error:', error);
			throw error;
		}
	}
}