export interface PackingItem {
    id: string;
    name: string;
    category: PackingCategory;
    isPacked: boolean;
    isAISuggested: boolean;
    weatherReason?: string; // e.g., "Recommended due to 80% rain chance"
    quantity: number;
    createdAt: any;
}

export type PackingCategory =
    | 'clothing'
    | 'toiletries'
    | 'electronics'
    | 'documents'
    | 'health'
    | 'accessories'
    | 'weather_gear'
    | 'destination_specific'
    | 'custom';

export const CATEGORY_LABELS: Record<PackingCategory, string> = {
    clothing: '👕 Clothing',
    toiletries: '🧴 Toiletries',
    electronics: '📱 Electronics',
    documents: '📄 Documents',
    health: '💊 Health & Medicine',
    accessories: '👜 Accessories',
    weather_gear: '🌧️ Weather Gear',
    destination_specific: '🎯 Destination Specific',
    custom: '📦 Custom Items',
};

export const CATEGORY_ICONS: Record<PackingCategory, string> = {
    clothing: '👕',
    toiletries: '🧴',
    electronics: '📱',
    documents: '📄',
    health: '💊',
    accessories: '👜',
    weather_gear: '🌧️',
    destination_specific: '🎯',
    custom: '📦',
};

export interface PackingListSettings {
    lastAISuggestionDate?: string;
    weatherDataUsed?: {
        avgTemp: number;
        rainProbability: number;
        conditions: string[];
    };
}

export interface PackingSuggestion {
    name: string;
    category: PackingCategory;
    quantity: number;
    weatherReason?: string;
}

export interface PackingSuggestionsResponse {
    suggestions: PackingSuggestion[];
    weatherSummary: {
        avgTemp: number;
        rainProbability: number;
        conditions: string[];
    };
}
