// 翻訳履歴のインターフェース
export interface TranslationHistoryItem {
	timestamp: string;
	originalText: string;
	translatedText: string;
}

// 翻訳スレッドのインターフェース
export interface TranslationThread {
	id: string;
	name: string;
	createdAt: string;
	lastUpdated: string;
	history: TranslationHistoryItem[];
	systemPrompt?: string; // スレッド固有のシステムプロンプト
}

// Gemini APIの設定インターフェース
export interface GeminiTranslateSettings {
	apiKey: string;
	model: string;
	targetLanguage: string;
	translationHistory: TranslationHistoryItem[]; // 後方互換性のため保持
	threads: TranslationThread[];
	currentThreadId: string | null;
	globalSystemPrompt: string; // グローバルシステムプロンプト
}

// ビューのタイプ定数
export const VIEW_TYPE_GEMINI_TRANSLATE = "gemini-translate-view";
