// Budget Prediction Types

export type TravelStyle = 'budget' | 'midrange' | 'premium';
export type PredictionConfidence = 'high' | 'medium' | 'low';

// P2 Granular Preferences
export type AccommodationStyle = 'hostel_budget' | 'standard_hotel' | 'luxury_hotel';
export type DiningStyle = 'street_budget' | 'casual_dining' | 'fine_dining';
export type ActivityPreference = 'low_cost' | 'standard_mixed' | 'premium_tours';

export interface CategoryBreakdown {
    category: string;
    amount: number;           // In user's base currency
    percentage: number;
    localAmount: number;      // In destination's local currency
    isCustomCategory?: boolean;
    icon?: string;
}

export interface SeasonalFactors {
    isPeakSeason: boolean;
    priceMultiplier: number;
    reason?: string;
}

export interface BudgetPredictionRequest {
    tripId: string;
    destination: string;
    destinations?: string[];  // For multi-destination trips
    startDate: string;        // ISO date
    endDate: string;          // ISO date
    travelStyle: TravelStyle;
    participantCount: number;
    userBaseCurrency: string; // User's preferred currency (e.g., 'INR')
}

export interface BudgetPredictionResponse {
    success: boolean;
    error?: {
        code: 'AI_UNAVAILABLE' | 'VALIDATION_FAILED' | 'RATE_LIMITED' | 'UNKNOWN';
        message: string;
    };
    prediction?: {
        totalCost: {
            amount: number;           // In user's base currency
            currency: string;         // User's base currency code
            localAmount: number;      // In destination's local currency
            localCurrency: string;    // Destination currency code
            exchangeRate: number;     // Rate used for conversion
            exchangeRateDate: string; // When rate was fetched (ISO date)
        };
        dailyAverage: number;       // In user's base currency
        perPersonCost: number;      // In user's base currency
        confidence: PredictionConfidence;
        confidenceScore: number;    // 0-100

        categoryBreakdown: CategoryBreakdown[];

        seasonalFactors?: SeasonalFactors;

        savingTips: string[];

        // Per-destination breakdown for multi-destination trips
        destinationBreakdown?: {
            destination: string;
            totalCost: number;
            localCurrency: string;
            days: number;
        }[];

        comparison?: {
            userBudget: number;
            gap: number;
            gapPercentage: number;
            recommendation: string;
        };
    };

    cached: boolean;
    generatedAt: string;  // ISO datetime
}

// Firestore document structure for caching predictions
export interface StoredBudgetPrediction {
    id: string;
    tripId: string;

    // Input parameters (for cache key)
    destination: string;
    destinations?: string[];
    startDate: string;
    endDate: string;
    travelStyle: TravelStyle;
    participantCount: number;
    userBaseCurrency: string;

    // Prediction output
    totalCost: number;
    currency: string;
    localTotalCost: number;
    localCurrency: string;
    exchangeRate: number;
    exchangeRateDate: string;
    dailyAverage: number;
    perPersonCost: number;
    confidence: PredictionConfidence;
    confidenceScore: number;

    categoryBreakdown: CategoryBreakdown[];
    savingTips: string[];
    seasonalFactors?: SeasonalFactors;
    destinationBreakdown?: {
        destination: string;
        totalCost: number;
        localCurrency: string;
        days: number;
    }[];

    // Tracking
    appliedToBudget: boolean;
    actualTotal?: number;       // Post-trip comparison

    createdAt: any;  // Firestore Timestamp
    expiresAt: any;  // Firestore Timestamp (24h TTL)
}

// Gemini raw output structure (before currency conversion)
export interface GeminiPredictionOutput {
    totalCost: {
        amount: number;
        currency: string;  // Local currency
    };
    dailyAverage: number;
    perPersonCost: number;
    confidence: PredictionConfidence;
    confidenceScore: number;
    categoryBreakdown: {
        category: string;
        amount: number;
        percentage: number;
        isCustomCategory?: boolean;
    }[];
    seasonalFactors?: SeasonalFactors;
    savingTips: string[];
}

// Currency conversion result
export interface ExchangeRateResult {
    rate: number;
    fromCurrency: string;
    toCurrency: string;
    date: string;  // ISO date
}

// Category icons mapping
export const CATEGORY_ICONS: Record<string, string> = {
    'food': '🍽️',
    'food & dining': '🍽️',
    'transport': '🚇',
    'transportation': '🚇',
    'accommodation': '🏨',
    'activities': '🎢',
    'shopping': '🛍️',
    'other': '📦',
    'flights': '✈️',
    'entertainment': '🎭',
    'spa': '💆',
    'wellness': '💆',
    'nightlife': '🍸',
};

export function getCategoryIcon(category: string): string {
    const normalized = category.toLowerCase();
    return CATEGORY_ICONS[normalized] || '📦';
}
