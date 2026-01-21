// AI Evals & Guardrails for Budget Predictions
// Validates and sanitizes AI-generated predictions

import { z } from 'zod';

// ============================================================
// SCHEMAS FOR VALIDATION
// ============================================================

// Raw prediction output from Gemini
const CategoryBreakdownSchema = z.object({
    category: z.string().min(1),
    amount: z.number().nonnegative(),
    percentage: z.number().min(0).max(100),
    isCustomCategory: z.boolean().optional().default(false),
    accommodationDetails: z.object({
        detected: z.boolean(),
        name: z.string().optional(),
        nights: z.number().optional(),
    }).optional(),
});

const SeasonalFactorsSchema = z.object({
    isPeakSeason: z.boolean(),
    priceMultiplier: z.number().min(0.5).max(3),
    reason: z.string().optional(),
});

const RawPredictionSchema = z.object({
    totalCost: z.object({
        amount: z.number().positive(),
        currency: z.string().length(3),
    }),
    dailyAverage: z.number().positive(),
    perPersonCost: z.number().positive(),
    confidence: z.enum(['high', 'medium', 'low']),
    confidenceScore: z.number().min(0).max(100),
    categoryBreakdown: z.array(CategoryBreakdownSchema).min(3),
    seasonalFactors: SeasonalFactorsSchema.optional(),
    savingTips: z.array(z.string()).min(1).max(5),
});

export type RawPredictionOutput = z.infer<typeof RawPredictionSchema>;

// ============================================================
// GUARDRAILS
// ============================================================

export interface EvalResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedOutput?: RawPredictionOutput;
}

export interface ValidationContext {
    flightClass?: string;  // 'economy' | 'premium_economy' | 'business' | 'first'
    travelStyle?: string;
    accommodationStyle?: string;
}

/**
 * Validate and sanitize raw prediction output from Gemini
 */
export function validatePrediction(rawOutput: unknown, context?: ValidationContext): EvalResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. JSON Schema Validation
    const parseResult = RawPredictionSchema.safeParse(rawOutput);
    if (!parseResult.success) {
        return {
            valid: false,
            errors: parseResult.error.issues.map(
                (issue) => `${issue.path.map(String).join('.')}: ${issue.message}`
            ),
            warnings: [],
        };
    }

    const prediction = parseResult.data;

    // 2. Category Sum Verification (must equal ~100%)
    const categorySum = prediction.categoryBreakdown.reduce(
        (sum, cat) => sum + cat.percentage,
        0
    );
    if (Math.abs(categorySum - 100) > 1) {
        // Normalize if off by more than 1%
        warnings.push(`Category percentages sum to ${categorySum}%, normalizing to 100%`);
        const factor = 100 / categorySum;
        prediction.categoryBreakdown = prediction.categoryBreakdown.map(cat => ({
            ...cat,
            percentage: Math.round(cat.percentage * factor * 10) / 10,
        }));
    }

    // 3. Category amounts should match percentages
    const calculatedTotal = prediction.categoryBreakdown.reduce(
        (sum, cat) => sum + cat.amount,
        0
    );
    if (Math.abs(calculatedTotal - prediction.totalCost.amount) > prediction.totalCost.amount * 0.05) {
        warnings.push(`Total cost (${prediction.totalCost.amount}) doesn't match sum of categories (${calculatedTotal}). Trusting category sum.`);

        // Trust the sum of components (Bottom-up approach)
        prediction.totalCost.amount = calculatedTotal;

        // Recalculate percentages to reflect the correct total
        prediction.categoryBreakdown = prediction.categoryBreakdown.map(cat => ({
            ...cat,
            percentage: Math.round((cat.amount / calculatedTotal) * 100),
        }));
    }

    // 4. Daily average check
    // This requires duration context which we don't have here, but we can check reasonability
    if (prediction.dailyAverage > prediction.totalCost.amount) {
        errors.push('Daily average cannot exceed total cost');
        return { valid: false, errors, warnings };
    }

    // 5. Per person check
    if (prediction.perPersonCost > prediction.totalCost.amount) {
        errors.push('Per-person cost cannot exceed total cost');
        return { valid: false, errors, warnings };
    }

    // 6. Confidence score should match confidence level
    const expectedRanges: Record<string, [number, number]> = {
        high: [70, 100],
        medium: [40, 69],
        low: [0, 39],
    };
    const [min, max] = expectedRanges[prediction.confidence];
    if (prediction.confidenceScore < min || prediction.confidenceScore > max) {
        warnings.push(
            `Confidence score ${prediction.confidenceScore} doesn't match level "${prediction.confidence}", adjusting`
        );
        // Adjust score to match level
        if (prediction.confidenceScore < min) {
            prediction.confidenceScore = min;
        } else if (prediction.confidenceScore > max) {
            prediction.confidenceScore = max;
        }
    }

    // 7. Flight Class Consistency Check
    if (context?.flightClass && ['business', 'first'].includes(context.flightClass)) {
        const flightCategory = prediction.categoryBreakdown.find(c => c.category.toLowerCase() === 'flights');

        if (flightCategory) {
            // In premium classes, flight cost is usually the dominant factor, especially for budget/midrange ground travel
            // If flight cost is < 30% of total budget for "First Class", something is likely wrong (unless it's a very long luxury trip)
            if (flightCategory.percentage < 30) {
                warnings.push(`Flight cost seems low (${flightCategory.percentage}%) for class "${context.flightClass}". Ensure flight prices aren't artificially suppressed by travel style.`);
            }

            // Also check absolute vs accommodation: First class flight > 1 night of accommodation usually (actually > total accommodation for short trips)
            const accommodation = prediction.categoryBreakdown.find(c => c.category.toLowerCase() === 'accommodation');
            if (accommodation && flightCategory.amount < accommodation.amount && context.travelStyle === 'budget') {
                warnings.push(`Suspicious: First/Business flight cost is lower than Budget accommodation total. Flight cost should be higher.`);
            }
        }
    }

    return {
        valid: true,
        errors: [],
        warnings,
        sanitizedOutput: prediction,
    };
}

// ============================================================
// COST REASONABILITY CHECKS
// ============================================================

// Average daily costs by destination region (rough estimates in USD)
const REGIONAL_DAILY_COSTS: Record<string, { min: number; max: number }> = {
    // Western Europe
    'france': { min: 80, max: 400 },
    'germany': { min: 70, max: 350 },
    'italy': { min: 70, max: 380 },
    'spain': { min: 60, max: 300 },
    'uk': { min: 90, max: 450 },
    'switzerland': { min: 120, max: 600 },
    // Asia
    'japan': { min: 80, max: 400 },
    'thailand': { min: 30, max: 200 },
    'vietnam': { min: 25, max: 150 },
    'india': { min: 20, max: 150 },
    'singapore': { min: 80, max: 400 },
    // Americas
    'usa': { min: 100, max: 500 },
    'mexico': { min: 40, max: 200 },
    'brazil': { min: 50, max: 250 },
    // Oceania
    'australia': { min: 90, max: 450 },
    'new zealand': { min: 80, max: 400 },
    // Middle East
    'uae': { min: 100, max: 600 },
    // Africa
    'south africa': { min: 50, max: 300 },
    'morocco': { min: 40, max: 200 },
    // Default
    'default': { min: 50, max: 400 },
};

// Approximate exchange rates to USD (for reasonability check only, not for display)
const APPROX_EXCHANGE_RATES_TO_USD: Record<string, number> = {
    'USD': 1,
    'EUR': 1.08,
    'GBP': 1.27,
    'JPY': 0.0067,
    'INR': 0.012,
    'LKR': 0.003,  // Sri Lankan Rupee
    'THB': 0.028,
    'VND': 0.00004,
    'MYR': 0.21,
    'SGD': 0.74,
    'AUD': 0.65,
    'NZD': 0.61,
    'CAD': 0.74,
    'CHF': 1.13,
    'CNY': 0.14,
    'KRW': 0.00075,
    'AED': 0.27,
    'ZAR': 0.055,
    'BRL': 0.20,
    'MXN': 0.058,
    'IDR': 0.000063,
    'PHP': 0.018,
};

/**
 * Check if predicted costs are reasonable for the destination
 */
export function checkCostReasonability(
    prediction: RawPredictionOutput,
    destination: string,
    days: number,
    participants: number,
    travelStyle: 'budget' | 'midrange' | 'premium'
): { reasonable: boolean; message?: string } {
    const destLower = destination.toLowerCase();

    // Find matching region
    let costRange = REGIONAL_DAILY_COSTS['default'];
    for (const [region, range] of Object.entries(REGIONAL_DAILY_COSTS)) {
        if (destLower.includes(region)) {
            costRange = range;
            break;
        }
    }

    // Adjust for travel style
    const styleMultipliers = {
        budget: { min: 0.5, max: 0.8 },
        midrange: { min: 0.8, max: 1.2 },
        premium: { min: 1.5, max: 3.0 },
    };
    const multiplier = styleMultipliers[travelStyle];

    const expectedMinDaily = costRange.min * multiplier.min;
    const expectedMaxDaily = costRange.max * multiplier.max;

    const expectedMinTotal = expectedMinDaily * days * participants;
    const expectedMaxTotal = expectedMaxDaily * days * participants;

    // Convert prediction to USD for comparison
    const currency = prediction.totalCost.currency.toUpperCase();
    const exchangeRate = APPROX_EXCHANGE_RATES_TO_USD[currency] || 1;
    const predictedTotalUSD = prediction.totalCost.amount * exchangeRate;

    console.log('[EVALS] Reasonability check:', {
        currency,
        exchangeRate,
        predictedLocal: prediction.totalCost.amount,
        predictedUSD: predictedTotalUSD,
        expectedMinUSD: expectedMinTotal * 0.3,
        expectedMaxUSD: expectedMaxTotal * 3,
    });

    // Check if within 0.3x to 3x of expected range (now in USD)
    if (predictedTotalUSD < expectedMinTotal * 0.3) {
        return {
            reasonable: false,
            message: `Predicted total (~$${Math.round(predictedTotalUSD)} USD) is absurdly low for ${destination}. Expected minimum: ~$${Math.round(expectedMinTotal * 0.3)} USD. The AI likely made a calculation error.`,
        };
    }

    if (predictedTotalUSD > expectedMaxTotal * 3) {
        return {
            reasonable: false,
            message: `Predicted total (~$${Math.round(predictedTotalUSD)} USD) is unusually high for ${destination}. Expected maximum: ~$${Math.round(expectedMaxTotal * 3)} USD`,
        };
    }

    return { reasonable: true };
}

// ============================================================
// RETRY PROMPT MODIFICATIONS
// ============================================================

/**
 * Generate modified prompt hints for retry based on validation errors
 */
export function getRetryPromptHints(errors: string[], warnings: string[]): string[] {
    const hints: string[] = [];

    for (const error of errors) {
        if (error.includes('percentage')) {
            hints.push('CRITICAL: Ensure category percentages sum to exactly 100%.');
        }
        if (error.includes('positive') || error.includes('negative')) {
            hints.push('CRITICAL: All cost amounts must be positive numbers.');
        }
        if (error.includes('confidence')) {
            hints.push('Ensure confidenceScore matches the confidence level: high=70-100, medium=40-69, low=0-39.');
        }
        if (error.includes('categoryBreakdown')) {
            hints.push('Include at least 3 categories with non-zero amounts.');
        }
    }

    // Deduplicate
    return [...new Set(hints)];
}

// ============================================================
// FULL EVALUATION PIPELINE
// ============================================================

export interface FullEvalResult extends EvalResult {
    reasonabilityCheck?: { reasonable: boolean; message?: string };
    retryHints?: string[];
}

/**
 * Run full evaluation pipeline on prediction output
 */
export function evaluatePrediction(
    rawOutput: unknown,
    context: {
        destination: string;
        days: number;
        participants: number;
        travelStyle: 'budget' | 'midrange' | 'premium';
    }
): FullEvalResult {
    // Step 1: Schema validation
    const validationResult = validatePrediction(rawOutput);

    if (!validationResult.valid) {
        return {
            ...validationResult,
            retryHints: getRetryPromptHints(validationResult.errors, validationResult.warnings),
        };
    }

    const prediction = validationResult.sanitizedOutput!;

    // Step 2: Cost reasonability
    const reasonabilityCheck = checkCostReasonability(
        prediction,
        context.destination,
        context.days,
        context.participants,
        context.travelStyle
    );

    if (!reasonabilityCheck.reasonable) {
        return {
            valid: false,
            errors: [reasonabilityCheck.message!],
            warnings: validationResult.warnings,
            retryHints: [`Cost seems unreasonable. ${reasonabilityCheck.message}`],
        };
    }

    return {
        valid: true,
        errors: [],
        warnings: validationResult.warnings,
        sanitizedOutput: prediction,
        reasonabilityCheck,
    };
}

// ============================================================
// CONFIDENCE THRESHOLD CHECK
// ============================================================

/**
 * Check if prediction meets minimum confidence threshold
 */
export function meetsConfidenceThreshold(prediction: RawPredictionOutput, minScore: number = 30): {
    meets: boolean;
    disclaimer?: string;
} {
    if (prediction.confidenceScore < minScore) {
        return {
            meets: false,
            disclaimer: `This prediction has low confidence (${prediction.confidenceScore}%). Actual costs may vary significantly.`,
        };
    }

    if (prediction.confidence === 'low') {
        return {
            meets: true,
            disclaimer: 'This destination has limited pricing data. Consider this a rough estimate.',
        };
    }

    return { meets: true };
}
