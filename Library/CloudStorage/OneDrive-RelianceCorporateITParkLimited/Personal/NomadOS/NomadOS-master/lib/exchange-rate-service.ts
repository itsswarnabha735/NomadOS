// Exchange Rate Service
// Uses exchangerate-api.com free tier for currency conversion

interface CacheEntry {
    rate: number;
    timestamp: number;
}

// In-memory cache with 1 hour TTL
const rateCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Fallback rates (as of Jan 2026) - used if API fails
const FALLBACK_RATES: Record<string, Record<string, number>> = {
    'USD': {
        'INR': 83.5,
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 148.5,
        'AUD': 1.53,
        'CAD': 1.36,
        'SGD': 1.34,
        'THB': 34.2,
        'LKR': 325,   // Sri Lankan Rupee
        'NPR': 133,   // Nepalese Rupee
        'PHP': 56,    // Philippine Peso
        'MYR': 4.4,   // Malaysian Ringgit
    },
    'EUR': {
        'INR': 90.8,
        'USD': 1.09,
        'GBP': 0.86,
        'JPY': 161.5,
    },
    'GBP': {
        'INR': 105.6,
        'USD': 1.27,
        'EUR': 1.16,
        'JPY': 188.0,
    },
    'JPY': {
        'INR': 0.56,
        'USD': 0.0067,
        'EUR': 0.0062,
        'GBP': 0.0053,
    },
};

// Currency to country mapping for destination detection
export const DESTINATION_CURRENCIES: Record<string, string> = {
    // Asia
    'japan': 'JPY',
    'tokyo': 'JPY',
    'osaka': 'JPY',
    'kyoto': 'JPY',
    'india': 'INR',
    'delhi': 'INR',
    'mumbai': 'INR',
    'thailand': 'THB',
    'bangkok': 'THB',
    'singapore': 'SGD',
    'indonesia': 'IDR',
    'bali': 'IDR',
    'vietnam': 'VND',
    'malaysia': 'MYR',
    'south korea': 'KRW',
    'seoul': 'KRW',
    'china': 'CNY',
    'hong kong': 'HKD',
    'sri lanka': 'LKR',
    'colombo': 'LKR',
    'nepal': 'NPR',
    'kathmandu': 'NPR',
    'maldives': 'MVR',
    'male': 'MVR',
    'bhutan': 'BTN',
    'philippines': 'PHP',
    'manila': 'PHP',
    'cambodia': 'KHR',
    'myanmar': 'MMK',
    'laos': 'LAK',

    // Europe
    'france': 'EUR',
    'paris': 'EUR',
    'germany': 'EUR',
    'berlin': 'EUR',
    'italy': 'EUR',
    'rome': 'EUR',
    'spain': 'EUR',
    'barcelona': 'EUR',
    'madrid': 'EUR',
    'netherlands': 'EUR',
    'amsterdam': 'EUR',
    'greece': 'EUR',
    'portugal': 'EUR',
    'united kingdom': 'GBP',
    'london': 'GBP',
    'uk': 'GBP',
    'switzerland': 'CHF',

    // Americas
    'usa': 'USD',
    'united states': 'USD',
    'new york': 'USD',
    'los angeles': 'USD',
    'san francisco': 'USD',
    'canada': 'CAD',
    'toronto': 'CAD',
    'vancouver': 'CAD',
    'mexico': 'MXN',
    'brazil': 'BRL',

    // Oceania
    'australia': 'AUD',
    'sydney': 'AUD',
    'melbourne': 'AUD',
    'new zealand': 'NZD',

    // Middle East
    'uae': 'AED',
    'dubai': 'AED',
    'saudi arabia': 'SAR',
};

export function getDestinationCurrency(destination: string): string {
    const normalized = destination.toLowerCase().trim();

    // Check direct match
    if (DESTINATION_CURRENCIES[normalized]) {
        return DESTINATION_CURRENCIES[normalized];
    }

    // Check if destination contains any known location
    for (const [location, currency] of Object.entries(DESTINATION_CURRENCIES)) {
        if (normalized.includes(location)) {
            return currency;
        }
    }

    // Default to USD if unknown
    return 'USD';
}

function getCacheKey(from: string, to: string): string {
    return `${from}_${to}`;
}

function getFromCache(from: string, to: string): number | null {
    const key = getCacheKey(from, to);
    const entry = rateCache.get(key);

    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.rate;
    }

    return null;
}

function setCache(from: string, to: string, rate: number): void {
    const key = getCacheKey(from, to);
    rateCache.set(key, {
        rate,
        timestamp: Date.now(),
    });
}

function getFallbackRate(from: string, to: string): number | null {
    if (from === to) return 1;

    // Direct lookup
    if (FALLBACK_RATES[from]?.[to]) {
        return FALLBACK_RATES[from][to];
    }

    // Inverse lookup
    if (FALLBACK_RATES[to]?.[from]) {
        return 1 / FALLBACK_RATES[to][from];
    }

    // Cross-rate via USD
    if (from !== 'USD' && to !== 'USD') {
        const fromToUsd = FALLBACK_RATES[from]?.['USD'] || (FALLBACK_RATES['USD']?.[from] ? 1 / FALLBACK_RATES['USD'][from] : null);
        const usdToTo = FALLBACK_RATES['USD']?.[to];

        if (fromToUsd && usdToTo) {
            return fromToUsd * usdToTo;
        }
    }

    return null;
}

export interface ExchangeRateResult {
    rate: number;
    fromCurrency: string;
    toCurrency: string;
    date: string;
    isLive: boolean;  // true if from API, false if from fallback
}

export async function getExchangeRate(
    from: string,
    to: string
): Promise<ExchangeRateResult> {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    // Same currency
    if (fromUpper === toUpper) {
        return {
            rate: 1,
            fromCurrency: fromUpper,
            toCurrency: toUpper,
            date: new Date().toISOString().split('T')[0],
            isLive: true,
        };
    }

    // Check cache first
    const cachedRate = getFromCache(fromUpper, toUpper);
    if (cachedRate !== null) {
        return {
            rate: cachedRate,
            fromCurrency: fromUpper,
            toCurrency: toUpper,
            date: new Date().toISOString().split('T')[0],
            isLive: true,
        };
    }

    try {
        // Try free exchangerate-api.com
        const response = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${fromUpper}`,
            { next: { revalidate: 3600 } }  // Cache for 1 hour
        );

        if (!response.ok) {
            throw new Error(`Exchange rate API returned ${response.status}`);
        }

        const data = await response.json();
        const rate = data.rates?.[toUpper];

        if (!rate) {
            throw new Error(`No rate found for ${toUpper}`);
        }

        // Cache the result
        setCache(fromUpper, toUpper, rate);

        return {
            rate,
            fromCurrency: fromUpper,
            toCurrency: toUpper,
            date: data.date || new Date().toISOString().split('T')[0],
            isLive: true,
        };
    } catch (error) {
        console.error('[ExchangeRate] API error, using fallback:', error);

        // Try fallback rates
        const fallbackRate = getFallbackRate(fromUpper, toUpper);

        if (fallbackRate !== null) {
            return {
                rate: fallbackRate,
                fromCurrency: fromUpper,
                toCurrency: toUpper,
                date: '2026-01-01',  // Indicate fallback date
                isLive: false,
            };
        }

        // Last resort: return 1 (same currency assumption)
        console.warn(`[ExchangeRate] No fallback rate for ${fromUpper} to ${toUpper}, returning 1`);
        return {
            rate: 1,
            fromCurrency: fromUpper,
            toCurrency: toUpper,
            date: new Date().toISOString().split('T')[0],
            isLive: false,
        };
    }
}

export async function convertCurrency(
    amount: number,
    from: string,
    to: string
): Promise<{ convertedAmount: number; exchangeResult: ExchangeRateResult }> {
    const exchangeResult = await getExchangeRate(from, to);
    const convertedAmount = amount * exchangeResult.rate;

    return {
        convertedAmount: Math.round(convertedAmount * 100) / 100,  // Round to 2 decimal places
        exchangeResult,
    };
}

// Get symbol for currency
export function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'INR': '₹',
        'AUD': 'A$',
        'CAD': 'C$',
        'SGD': 'S$',
        'THB': '฿',
        'MYR': 'RM',
        'KRW': '₩',
        'CNY': '¥',
        'HKD': 'HK$',
        'CHF': 'CHF',
        'AED': 'د.إ',
        'NZD': 'NZ$',
    };

    return symbols[currency.toUpperCase()] || currency;
}

// Format currency amount
export function formatCurrency(amount: number, currency: string): string {
    const symbol = getCurrencySymbol(currency);

    // Use locale formatting for large numbers
    const formatted = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
        minimumFractionDigits: 0,
    }).format(amount);

    return `${symbol}${formatted}`;
}
