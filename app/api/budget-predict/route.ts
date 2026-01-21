// Budget Prediction API Endpoint
// POST /api/budget-predict

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateBudgetPrediction, generateMultiDestinationPrediction } from '@/lib/gemini-budget-predict';
import {
    getExchangeRate,
    getDestinationCurrency,
    convertCurrency,
} from '@/lib/exchange-rate-service';
import {
    BudgetPredictionRequest,
    BudgetPredictionResponse,
    CategoryBreakdown,
    getCategoryIcon,
} from '@/types/budget-prediction';
// P1 imports
import { getItineraryContext, ItineraryContext } from '@/lib/itinerary-context';
import { detectAccommodation, DetectedAccommodation } from '@/lib/accommodation-detector';

// Request validation schema
const RequestSchema = z.object({
    tripId: z.string().optional(),
    destination: z.string().min(1, "Destination is required"),
    destinations: z.array(z.string()).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    travelStyle: z.enum(['budget', 'midrange', 'premium']),
    participantCount: z.number().int().min(1).max(20),
    flightClass: z.enum(['economy', 'premium_economy', 'business', 'first']).optional().default('economy'),
    transportPreference: z.enum(['public', 'cabs', 'rental', 'mixed']).optional().default('mixed'),
    accommodationStyle: z.enum(['hostel_budget', 'standard_hotel', 'luxury_hotel']).optional().default('standard_hotel'),
    diningStyle: z.enum(['street_budget', 'casual_dining', 'fine_dining']).optional().default('casual_dining'),
    activityPreference: z.enum(['low_cost', 'standard_mixed', 'premium_tours']).optional().default('standard_mixed'),
    origin: z.string().optional(),
    userBaseCurrency: z.string().length(3, "Currency must be 3 characters"),
    userBudget: z.number().optional(),  // For gap comparison
});

export async function POST(request: Request) {
    console.log('[BUDGET-PREDICT] API endpoint called');

    try {
        const body = await request.json();

        // Validate request
        const validationResult = RequestSchema.safeParse(body);
        if (!validationResult.success) {
            console.error('[BUDGET-PREDICT] Validation error:', validationResult.error);
            return NextResponse.json({
                success: false,
                error: {
                    code: 'VALIDATION_FAILED',
                    message: validationResult.error.issues.map((e: { message: string }) => e.message).join(', '),
                },
                cached: false,
                generatedAt: new Date().toISOString(),
            } as BudgetPredictionResponse, { status: 400 });
        }


        const params = validationResult.data;
        console.log('[BUDGET-PREDICT] Request params:', {
            destination: params.destination,
            destinations: params.destinations,
            style: params.travelStyle, // Keeping for logging, but deprecated logic-wise
            participants: params.participantCount,
            currency: params.userBaseCurrency,
            origin: params.origin,
            accommodation: params.accommodationStyle,
            dining: params.diningStyle,
            activities: params.activityPreference
        });

        // Determine if multi-destination
        const isMultiDestination = params.destinations && params.destinations.length > 1;
        const allDestinations = isMultiDestination
            ? params.destinations!
            : [params.destination];

        // Get destination currency (use first destination for primary currency)
        const localCurrency = getDestinationCurrency(allDestinations[0]);
        console.log('[BUDGET-PREDICT] Detected local currency:', localCurrency);

        // Generate prediction(s)
        let rawPrediction;
        let destinationBreakdown: { destination: string; totalCost: number; localCurrency: string; days: number }[] | undefined;

        if (isMultiDestination) {
            // Multi-destination prediction
            console.log('[BUDGET-PREDICT] Generating multi-destination prediction');
            const multiResult = await generateMultiDestinationPrediction(
                allDestinations,
                {
                    startDate: params.startDate,
                    endDate: params.endDate,
                    travelStyle: params.travelStyle,
                    participantCount: params.participantCount,
                }
            );

            if (!multiResult.success || !multiResult.predictions) {
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'AI_UNAVAILABLE',
                        message: multiResult.error || 'Failed to generate prediction',
                    },
                    cached: false,
                    generatedAt: new Date().toISOString(),
                } as BudgetPredictionResponse, { status: 503 });
            }

            // Aggregate predictions
            const totalDays = calculateDays(params.startDate, params.endDate);
            const daysPerDest = Math.floor(totalDays / allDestinations.length);

            // Use first prediction as base for structure
            rawPrediction = multiResult.predictions[0].prediction;

            // Aggregate totals (convert all to first destination's currency, then to user currency)
            let aggregatedTotal = 0;
            destinationBreakdown = [];

            for (const { destination, prediction } of multiResult.predictions) {
                aggregatedTotal += prediction.totalCost.amount;
                destinationBreakdown.push({
                    destination,
                    totalCost: prediction.totalCost.amount,
                    localCurrency: prediction.totalCost.currency,
                    days: daysPerDest,
                });
            }

            // Update raw prediction with aggregated values
            rawPrediction.totalCost.amount = aggregatedTotal;
            rawPrediction.dailyAverage = aggregatedTotal / totalDays;
            rawPrediction.perPersonCost = aggregatedTotal / params.participantCount;

        } else {
            console.log('[BUDGET-PREDICT] Generating single destination prediction');

            // P1: Fetch itinerary context and accommodation (if tripId provided)
            let itineraryContext: ItineraryContext | undefined;
            let detectedAccommodation: DetectedAccommodation | null = null;

            if (params.tripId) {
                console.log('[BUDGET-PREDICT] Fetching P1 context for tripId:', params.tripId);

                // Fetch in parallel for performance
                const [itinCtx, accDetection] = await Promise.all([
                    getItineraryContext(params.tripId).catch(e => {
                        console.warn('[BUDGET-PREDICT] Failed to get itinerary:', e);
                        return null;
                    }),
                    detectAccommodation(params.tripId).catch(e => {
                        console.warn('[BUDGET-PREDICT] Failed to detect accommodation:', e);
                        return null;
                    }),
                ]);

                itineraryContext = itinCtx || undefined;
                detectedAccommodation = accDetection;

                console.log('[BUDGET-PREDICT] P1 context:', {
                    poiCount: itineraryContext?.poiCount || 0,
                    hasAccommodation: !!detectedAccommodation,
                });
            }

            const result = await generateBudgetPrediction({
                destination: params.destination,
                startDate: params.startDate,
                endDate: params.endDate,
                travelStyle: params.travelStyle,
                participantCount: params.participantCount,
                // Travel preferences
                flightClass: params.flightClass,
                transportPreference: params.transportPreference,
                accommodationStyle: params.accommodationStyle,
                diningStyle: params.diningStyle,
                activityPreference: params.activityPreference,
                origin: params.origin,
                // P1 additions
                itineraryContext: itineraryContext,
                detectedAccommodation: detectedAccommodation ? {
                    name: detectedAccommodation.name,
                    checkIn: detectedAccommodation.checkIn,
                    checkOut: detectedAccommodation.checkOut,
                    nights: detectedAccommodation.nights,
                } : undefined,
            });

            if (!result.success || !result.prediction) {
                return NextResponse.json({
                    success: false,
                    error: {
                        code: 'AI_UNAVAILABLE',
                        message: result.error || 'Failed to generate prediction',
                    },
                    cached: false,
                    generatedAt: new Date().toISOString(),
                } as BudgetPredictionResponse, { status: 503 });
            }

            rawPrediction = result.prediction;
        }

        // Get exchange rate
        const predictedCurrency = rawPrediction.totalCost.currency;
        const exchangeResult = await getExchangeRate(predictedCurrency, params.userBaseCurrency);

        console.log('[BUDGET-PREDICT] Exchange rate:', {
            from: predictedCurrency,
            to: params.userBaseCurrency,
            rate: exchangeResult.rate,
        });

        // Convert amounts to user's base currency
        const totalInUserCurrency = rawPrediction.totalCost.amount * exchangeResult.rate;
        const dailyInUserCurrency = rawPrediction.dailyAverage * exchangeResult.rate;
        const perPersonInUserCurrency = rawPrediction.perPersonCost * exchangeResult.rate;

        // Convert category breakdown
        const convertedCategories: CategoryBreakdown[] = rawPrediction.categoryBreakdown.map(cat => ({
            category: cat.category,
            amount: Math.round(cat.amount * exchangeResult.rate),
            percentage: cat.percentage,
            localAmount: cat.amount,
            isCustomCategory: cat.isCustomCategory,
            icon: getCategoryIcon(cat.category),
        }));

        // Calculate budget comparison if user budget provided
        let comparison;
        if (params.userBudget && params.userBudget > 0) {
            const gap = totalInUserCurrency - params.userBudget;
            const gapPercentage = (gap / params.userBudget) * 100;

            let recommendation = '';
            if (gap > 0) {
                if (gapPercentage > 50) {
                    recommendation = 'Consider switching to a more budget-friendly travel style or reducing trip duration.';
                } else if (gapPercentage > 20) {
                    recommendation = 'You may want to increase your budget or cut back on some activities.';
                } else {
                    recommendation = 'Your budget is slightly under the prediction. Consider adding a small buffer.';
                }
            } else {
                recommendation = 'Your budget looks comfortable for this trip!';
            }

            comparison = {
                userBudget: params.userBudget,
                gap: Math.round(gap),
                gapPercentage: Math.round(gapPercentage),
                recommendation,
            };
        }

        // Build response
        const response: BudgetPredictionResponse = {
            success: true,
            prediction: {
                totalCost: {
                    amount: Math.round(totalInUserCurrency),
                    currency: params.userBaseCurrency,
                    localAmount: Math.round(rawPrediction.totalCost.amount),
                    localCurrency: predictedCurrency,
                    exchangeRate: Math.round(exchangeResult.rate * 10000) / 10000,
                    exchangeRateDate: exchangeResult.date,
                },
                dailyAverage: Math.round(dailyInUserCurrency),
                perPersonCost: Math.round(perPersonInUserCurrency),
                confidence: rawPrediction.confidence,
                confidenceScore: rawPrediction.confidenceScore,
                categoryBreakdown: convertedCategories,
                seasonalFactors: rawPrediction.seasonalFactors,
                savingTips: rawPrediction.savingTips,
                destinationBreakdown,
                comparison,
            },
            cached: false,
            generatedAt: new Date().toISOString(),
        };

        console.log('[BUDGET-PREDICT] Prediction generated successfully');
        return NextResponse.json(response);

    } catch (error) {
        console.error('[BUDGET-PREDICT] Error:', error);

        return NextResponse.json({
            success: false,
            error: {
                code: 'UNKNOWN',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
            cached: false,
            generatedAt: new Date().toISOString(),
        } as BudgetPredictionResponse, { status: 500 });
    }
}

function calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}
