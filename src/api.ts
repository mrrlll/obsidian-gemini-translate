import { GeminiTranslateSettings } from "./types";

export class GeminiAPI {
	private settings: GeminiTranslateSettings;

	constructor(settings: GeminiTranslateSettings) {
		this.settings = settings;
	}

	async translateText(
		text: string,
		threadSystemPrompt?: string
	): Promise<string> {
		if (!this.settings.apiKey) {
			throw new Error(
				"APIキーが設定されていません。設定画面でAPIキーを入力してください。"
			);
		}

		try {
			// システムプロンプトを構築
			let systemPrompt = "";

			// グローバルシステムプロンプトを追加
			if (this.settings.globalSystemPrompt) {
				systemPrompt += this.settings.globalSystemPrompt + "\n\n";
			}

			// スレッド固有のシステムプロンプトを追加
			if (threadSystemPrompt) {
				systemPrompt += threadSystemPrompt + "\n\n";
			}

			// 基本的な翻訳指示
			const translationInstruction = `次のテキストを${this.settings.targetLanguage}に翻訳してください。翻訳のみを返してください。`;

			const finalPrompt =
				systemPrompt + translationInstruction + `\n\nテキスト: ${text}`;

			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${this.settings.model}:generateContent?key=${this.settings.apiKey}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						contents: [
							{
								parts: [
									{
										text: finalPrompt,
									},
								],
							},
						],
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`);
			}

			const data = await response.json();
			return data.candidates[0].content.parts[0].text;
		} catch (error) {
			console.error("Translation error:", error);
			throw error;
		}
	}
}
