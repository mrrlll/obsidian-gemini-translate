// 翻訳履歴のインターフェース
export interface TranslationHistoryItem {
	timestamp: string;
	originalText: string;
	translatedText: string;
}

// Gemini APIの設定インターフェース
export interface GeminiTranslateSettings {
	apiKey: string;
	model: string;
	targetLanguage: string;
	translationHistory: TranslationHistoryItem[];
}

// ビューのタイプ定数
export const VIEW_TYPE_GEMINI_TRANSLATE = "gemini-translate-view";