// Gemini Budget Prediction Service
// Uses Google Gemini to generate AI-powered cost predictions

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import {
    TravelStyle,
    GeminiPredictionOutput,
    PredictionConfidence,
    AccommodationStyle,
    DiningStyle,
    ActivityPreference
} from "@/types/budget-prediction";
import { validatePrediction, ValidationContext } from "@/lib/budget-prediction-evals";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Travel style descriptions for prompt
const TRAVEL_STYLE_DESCRIPTIONS: Record<TravelStyle, string> = {
    budget: "Budget travel: Hostels/budget hotels, street food and local eateries, public transport, free/cheap attractions, backpacker-style",
    midrange: "Mid-range travel: 3-4 star hotels, casual restaurants, mix of public and private transport, popular attractions with entry fees",
    premium: "Premium/Luxury travel: 5-star hotels and resorts, fine dining restaurants, private transport/taxis, exclusive experiences and VIP access",
};

// Default category percentages by travel style
const DEFAULT_CATEGORY_PERCENTAGES: Record<TravelStyle, Record<string, number>> = {
    budget: {
        'Flights': 25,
        'Food': 20,
        'Transport': 10,
        'Accommodation': 25,
        'Activities': 10,
        'Shopping': 5,
        'Other': 5,
    },
    midrange: {
        'Flights': 25,
        'Food': 18,
        'Transport': 10,
        'Accommodation': 28,
        'Activities': 10,
        'Shopping': 5,
        'Other': 4,
    },
    premium: {
        'Flights': 20,
        'Food': 15,
        'Transport': 8,
        'Accommodation': 35,
        'Activities': 12,
        'Shopping': 5,
        'Other': 5,
    },
};

// PredictionParams interface moved below after helper functions

export interface PredictionResult {
    success: boolean;
    prediction?: GeminiPredictionOutput;
    error?: string;
}

function calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Detect if dates fall in peak season
function detectSeasonContext(startDate: string, destination: string): string {
    const date = new Date(startDate);
    const month = date.getMonth() + 1; // 1-12
    const destLower = destination.toLowerCase();

    // Christmas/New Year (global peak)
    if (month === 12 || month === 1) {
        return "PEAK SEASON: Christmas and New Year period - expect 20-50% higher prices across most categories.";
    }

    // Summer in Northern Hemisphere destinations
    if (month >= 6 && month <= 8) {
        if (destLower.includes('europe') || destLower.includes('france') || destLower.includes('italy') ||
            destLower.includes('spain') || destLower.includes('greece') || destLower.includes('usa') ||
            destLower.includes('canada') || destLower.includes('japan')) {
            return "PEAK SEASON: Summer holiday period - expect 20-40% higher prices for accommodation and flights.";
        }
    }

    // Cherry blossom season in Japan
    if ((month === 3 || month === 4) && destLower.includes('japan')) {
        return "PEAK SEASON: Cherry blossom (Sakura) season - expect 30-50% higher accommodation prices.";
    }

    // Ski season
    if ((month === 12 || month === 1 || month === 2) &&
        (destLower.includes('swiss') || destLower.includes('alps') || destLower.includes('ski') ||
            destLower.includes('aspen') || destLower.includes('chamonix'))) {
        return "PEAK SEASON: Ski season - expect premium prices for accommodation and activities.";
    }

    // Diwali/Festival season in India
    if ((month === 10 || month === 11) && destLower.includes('india')) {
        return "PEAK SEASON: Festival season (Diwali) - expect higher domestic travel prices.";
    }

    // Off-peak
    if (month === 2 || month === 9 || month === 11) {
        return "OFF-PEAK SEASON: Generally lower prices. Good deals available on accommodation.";
    }

    return "REGULAR SEASON: Standard pricing expected.";
}

// Generate participant scaling notes
function getParticipantScalingNotes(count: number): string {
    if (count === 1) {
        return "Single traveler - no room sharing. Solo supplement may apply for accommodation.";
    }
    if (count === 2) {
        return "Two travelers - can share double rooms. Per-person accommodation cost is reduced.";
    }
    if (count >= 3 && count <= 4) {
        return `Group of ${count} - family rooms or 2 double rooms. Group activities may have discounts.`;
    }
    if (count >= 5) {
        return `Large group of ${count} - consider group rates for activities and multi-room bookings. Group transport may be cheaper than individual.`;
    }
    return "";
}

export type FlightClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type TransportPreference = 'public' | 'cabs' | 'rental' | 'mixed';

const FLIGHT_CLASS_DESCRIPTIONS: Record<FlightClass, string> = {
    economy: 'Economy class flights',
    premium_economy: 'Premium economy class flights',
    business: 'Business class flights',
    first: 'First class flights',
};

const TRANSPORT_DESCRIPTIONS: Record<TransportPreference, string> = {
    public: 'Public transport only (metro, bus, trains)',
    cabs: 'Taxis/cabs only (Uber, Ola, local taxis)',
    rental: 'Self-drive rental car',
    mixed: 'Mix of public transport and cabs as needed',
};

export interface PredictionParams {
    destination: string;
    destinations?: string[];
    startDate: string;
    endDate: string;
    travelStyle: TravelStyle;
    participantCount: number;
    // Travel preferences
    flightClass?: FlightClass;
    transportPreference?: TransportPreference;
    accommodationStyle?: AccommodationStyle;
    diningStyle?: DiningStyle;
    activityPreference?: ActivityPreference;
    origin?: string;
    // P1 additions
    itineraryContext?: {
        poiCount: number;
        poiTypes: string[];
        poiNames?: string[];
    };
    detectedAccommodation?: {
        name: string;
        checkIn: string;
        checkOut: string;
        nights: number;
    };
}

function buildPrompt(params: PredictionParams): string {
    const days = calculateDays(params.startDate, params.endDate);
    const destinations = params.destinations?.length
        ? params.destinations.join(", ")
        : params.destination;

    // Compute preference descriptions
    const flightClass = params.flightClass || 'economy';
    const transportPref = params.transportPreference || 'mixed';
    const flightDescription = FLIGHT_CLASS_DESCRIPTIONS[flightClass];
    const transportDescription = TRANSPORT_DESCRIPTIONS[transportPref];

    // Granular preferences (fallback to travel style if not provided)
    const accomStyle = params.accommodationStyle || (params.travelStyle === 'budget' ? 'hostel_budget' : params.travelStyle === 'premium' ? 'luxury_hotel' : 'standard_hotel');
    const diningStyle = params.diningStyle || (params.travelStyle === 'budget' ? 'street_budget' : params.travelStyle === 'premium' ? 'fine_dining' : 'casual_dining');
    const activityPref = params.activityPreference || (params.travelStyle === 'budget' ? 'low_cost' : params.travelStyle === 'premium' ? 'premium_tours' : 'standard_mixed');

    // Friendly descriptions
    const accomDesc = accomStyle === 'hostel_budget' ? 'Hostels/Budget Stays' : accomStyle === 'luxury_hotel' ? '5-Star/Luxury Hotels' : 'Standard 3-4 Star Hotels';
    const diningDesc = diningStyle === 'street_budget' ? 'Street Food/Cheap Eats' : diningStyle === 'fine_dining' ? 'Fine Dining/Upscale' : 'Casual Restaurants';
    const activityDesc = activityPref === 'low_cost' ? 'Free/Low Cost Activities' : activityPref === 'premium_tours' ? 'Premium/Private Tours' : 'Standard Mix of Activities';

    // Context helpers
    const seasonContext = detectSeasonContext(params.startDate, params.destination);
    const participantNotes = getParticipantScalingNotes(params.participantCount);

    // Build itinerary context
    let itinerarySection = '';
    if (params.itineraryContext && params.itineraryContext.poiCount > 0) {
        const { poiCount, poiTypes, poiNames } = params.itineraryContext;
        itinerarySection = `
Itinerary Details:
- Number of planned activities/POIs: ${poiCount}
- Activity types: ${poiTypes.join(', ')}
${poiNames && poiNames.length > 0 ? `- Specific places: ${poiNames.slice(0, 10).join(', ')}` : ''}
- Factor in entry fees, tickets, and activity costs for these planned items.
- If any activities suggest unique categories (e.g., "Skiing", "Scuba Diving", "Spa"), create CUSTOM categories.`;
    }

    // Build accommodation context
    let accommodationSection = '';
    if (params.detectedAccommodation) {
        const { name, checkIn, checkOut, nights } = params.detectedAccommodation;
        accommodationSection = `
Accommodation Booking Detected:
- Hotel/Property: ${name}
- Check-in: ${checkIn}, Check-out: ${checkOut}
- Nights: ${nights}
- IMPORTANT: Use this SPECIFIC property for the Accommodation cost. Ignore the "Accommodation Style" preference since we have a real booking.`;
    }

    // Generate the improved prompt
    return `You are a travel cost estimation engine. Generate a realistic budget prediction based on the specific preferences for each category.

═══════════════════════════════════════════════════════════════
VALIDATION RULES (Read First — These Override All Other Logic)
═══════════════════════════════════════════════════════════════

1. totalCost.amount MUST equal the exact sum of all categoryBreakdown amounts
2. All amounts must be positive numbers greater than zero
3. Category percentages must sum to 100 (±0.5 tolerance for rounding)
4. Minimum realistic thresholds for international travel:
   - Any multi-day international trip: > $300 USD equivalent total
   - Per-person daily minimum (budget tier): > $30 USD equivalent
   - Round-trip international flights: > $150 USD equivalent per person

If inputs are invalid or unrealistic results occur, recalculate before responding.

═══════════════════════════════════════════════════════════════
TRIP CONFIGURATION
═══════════════════════════════════════════════════════════════

Destination(s): ${destinations}
Duration: ${days} days
Travelers: ${params.participantCount}
Origin: ${params.origin || "Not specified — estimate from nearest major international hub"}
Travel Window: ${params.startDate} to ${params.endDate}

═══════════════════════════════════════════════════════════════
CATEGORY-SPECIFIC PREFERENCES (Calculate Each Independently)
═══════════════════════════════════════════════════════════════

Each category below has its own preference setting. Calculate costs for each category using ONLY that category's setting. A traveler may fly First Class but eat Street Food — price accordingly.

| Category      | Setting                                                    |
|---------------|------------------------------------------------------------|
| FLIGHTS       | ${flightClass.toUpperCase()} — ${flightDescription}        |
| ACCOMMODATION | ${accomDesc} (${accomStyle})                               |
| FOOD          | ${diningDesc} (${diningStyle})                             |
| ACTIVITIES    | ${activityDesc} (${activityPref})                          |
| TRANSPORT     | ${transportDescription}                                    |

═══════════════════════════════════════════════════════════════
CONTEXTUAL FACTORS
═══════════════════════════════════════════════════════════════

Seasonal Context:
${seasonContext || "No specific seasonal data — use average pricing"}

Participant Notes:
${participantNotes || "Standard adult travelers"}
${itinerarySection}
${accommodationSection}

═══════════════════════════════════════════════════════════════
CALCULATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════

Follow this exact sequence:

Step 1: Determine Output Currency
- For major destinations, use the local currency: USD, EUR, GBP, JPY, INR, AUD, SGD, THB, AED, CHF
- For destinations with uncommon currencies (Iceland ISK, Norway NOK, Czech CZK, Egypt EGP, Seychelles SCR, Kenya KES, Morocco MAD, etc.), use USD instead to ensure accurate conversion
- If multiple destinations span currency zones, use USD

Step 2: Calculate Each Category (Independent of Others)

For each category, estimate the TOTAL cost for ALL ${params.participantCount} travelers for ALL ${days} days:

a) FLIGHTS
   - Base cost on: ${flightClass.toUpperCase()} class
   - Factor: Route distance, carrier type, booking window
   - Output: Total round-trip cost for all travelers

b) ACCOMMODATION  
   - Base cost on: ${accomDesc}
   - Factor: Location within destination, ${days - 1} nights
   - Output: Total lodging cost for entire stay

c) FOOD
   - Base cost on: ${diningStyle}
   - Factor: 3 meals/day × ${days} days × ${params.participantCount} people
   - Output: Total food and beverage cost

d) ACTIVITIES
   - Base cost on: ${activityPref}
   - Factor: Typical activity frequency for preference level
   - Output: Total activities, entrance fees, tours

e) TRANSPORT
   - Base cost on: ${transportDescription}
   - Factor: Daily transport needs within destination
   - Output: Total ground transportation (excluding flights)

f) SHOPPING
   - Include: Souvenirs, gifts, retail purchases
   - Estimate: 3-5% of other categories combined

g) OTHER
   - Include: Travel insurance, visa fees (if applicable), tips, SIM cards
   - Estimate: 5-8% of other categories combined

h) CUSTOM CATEGORIES (if applicable)
   - Add specialized categories only if itinerary specifies unique activities
   - Examples: Scuba certification, multi-day trek permits, equipment rental

Step 3: Sum and Validate
- Add all category amounts to get totalCost.amount
- Verify total passes minimum threshold checks
- If total seems unrealistically low, re-examine each category

Step 4: Calculate Derived Values
- dailyAverage = totalCost.amount / ${days}
- perPersonCost = totalCost.amount / ${params.participantCount}

Step 5: Calculate Percentages
- For each category: (categoryAmount / totalCost.amount) × 100
- Round to 1 decimal place
- Adjust largest category if needed to ensure sum = 100

Step 6: Generate Tips and Confidence
- Provide 2-3 specific, actionable money-saving tips relevant to this destination
- Assign confidence: "high" (well-known destination, clear preferences), "medium" (some unknowns), "low" (unusual destination or limited data)
- Assign confidenceScore: 0-100 based on data availability

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Respond with ONLY valid JSON matching this exact schema:

\`\`\`json
{
  "totalCost": {
    "amount": <number: sum of all category amounts>,
    "currency": "<string: 3-letter ISO currency code>"
  },
  "dailyAverage": <number: totalCost.amount / ${days}>,
  "perPersonCost": <number: totalCost.amount / ${params.participantCount}>,
  "confidence": "<string: 'high' | 'medium' | 'low'>",
  "confidenceScore": <number: 0-100>,
  "categoryBreakdown": [
    {
      "category": "Flights",
      "amount": <number>,
      "percentage": <number: 0-100>,
      "isCustomCategory": false
    },
    {
      "category": "Food",
      "amount": <number>,
      "percentage": <number>,
      "isCustomCategory": false
    },
    {
      "category": "Transport",
      "amount": <number>,
      "percentage": <number>,
      "isCustomCategory": false
    },
    {
      "category": "Accommodation",
      "amount": <number>,
      "percentage": <number>,
      "isCustomCategory": false,
      "accommodationDetails": {
        "detected": ${!!params.detectedAccommodation},
        "name": "${params.detectedAccommodation?.name || ''}",
        "nights": ${params.detectedAccommodation?.nights || days - 1}
      }
    },
    {
      "category": "Activities",
      "amount": <number>,
      "percentage": <number>,
      "isCustomCategory": false
    },
    {
      "category": "Shopping",
      "amount": <number>,
      "percentage": <number>,
      "isCustomCategory": false
    },
    {
      "category": "Other",
      "amount": <number>,
      "percentage": <number>,
      "isCustomCategory": false
    }
  ],
  "seasonalFactors": {
    "isPeakSeason": <boolean>,
    "priceMultiplier": <number: multiplier used, e.g., 1.2 for peak season>,
    "reason": "<string: e.g., 'Peak tourist season in December'>"
  },
  "savingTips": [
    "<string: specific tip 1>",
    "<string: specific tip 2>",
    "<string: specific tip 3>"
  ]
}
\`\`\`

═══════════════════════════════════════════════════════════════
FINAL CHECKLIST (Verify Before Responding)
═══════════════════════════════════════════════════════════════

□ Each category cost reflects ONLY its specific preference setting
□ Flights priced for ${flightClass.toUpperCase()} regardless of other categories
□ Food priced for ${diningStyle} regardless of flight class
□ totalCost.amount = exact sum of all categoryBreakdown amounts
□ Percentages sum to 100 (±0.5)
□ Total exceeds minimum realistic threshold for ${days}-day international trip
□ dailyAverage and perPersonCost are mathematically correct
□ Output is valid JSON with no additional text

Generate the JSON response now.`;
}


function validateAndParseOutput(text: string): GeminiPredictionOutput | null {
    try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[GeminiBudget] No JSON found in response");
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!parsed.totalCost?.amount || !parsed.totalCost?.currency) {
            console.error("[GeminiBudget] Missing totalCost");
            return null;
        }

        if (!Array.isArray(parsed.categoryBreakdown) || parsed.categoryBreakdown.length === 0) {
            console.error("[GeminiBudget] Missing or empty categoryBreakdown");
            return null;
        }

        // Validate percentages sum to ~100 (allow small rounding errors)
        const percentageSum = parsed.categoryBreakdown.reduce(
            (sum: number, cat: any) => sum + (cat.percentage || 0),
            0
        );

        if (percentageSum < 95 || percentageSum > 105) {
            console.warn(`[GeminiBudget] Category percentages sum to ${percentageSum}, normalizing...`);
            // Normalize percentages
            const factor = 100 / percentageSum;
            parsed.categoryBreakdown = parsed.categoryBreakdown.map((cat: any) => ({
                ...cat,
                percentage: Math.round((cat.percentage || 0) * factor),
            }));
        }

        // Ensure all required fields have defaults
        const result: GeminiPredictionOutput = {
            totalCost: {
                amount: parsed.totalCost.amount,
                currency: parsed.totalCost.currency,
            },
            dailyAverage: parsed.dailyAverage || parsed.totalCost.amount,
            perPersonCost: parsed.perPersonCost || parsed.totalCost.amount,
            confidence: (parsed.confidence as PredictionConfidence) || 'medium',
            confidenceScore: parsed.confidenceScore || 50,
            categoryBreakdown: parsed.categoryBreakdown.map((cat: any) => ({
                category: cat.category,
                amount: cat.amount || 0,
                percentage: cat.percentage || 0,
                isCustomCategory: cat.isCustomCategory || false,
            })),
            seasonalFactors: parsed.seasonalFactors,
            savingTips: parsed.savingTips || [],
        };

        return result;
    } catch (error) {
        console.error("[GeminiBudget] Error parsing output:", error);
        return null;
    }
}

export async function generateBudgetPrediction(
    params: PredictionParams
): Promise<PredictionResult> {
    try {
        const model: GenerativeModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const prompt = buildPrompt(params);

        console.log("[GeminiBudget] Generating prediction for:", params.destination);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
            },
        });

        const responseText = result.response.text();
        console.log("[GeminiBudget] Raw response length:", responseText.length);

        let prediction = validateAndParseOutput(responseText);

        // P1: Run business logic validation
        const validationContext: ValidationContext = {
            flightClass: params.flightClass,
            travelStyle: params.travelStyle,
            accommodationStyle: params.accommodationStyle
        };

        let evalResult = prediction ? validatePrediction(prediction, validationContext) : { valid: false, errors: [], warnings: [] };
        const hasFlightWarnings = evalResult.warnings.some(w => w.includes("Flight cost") || w.includes("Suspicious"));

        if (!prediction || hasFlightWarnings) {
            console.log("[GeminiBudget] Validation failed or warnings found:", {
                parseSuccess: !!prediction,
                warnings: evalResult.warnings
            });
            console.log("[GeminiBudget] Retrying with specific guidance...");

            let retryPrompt = prompt + "\n\nIMPORTANT: Output ONLY valid JSON.";

            if (hasFlightWarnings) {
                retryPrompt += `\n\nCRITICAL CORRECTION REQUIRED:
The previous prediction was rejected because: ${evalResult.warnings.join('. ')}.
RECALCULATE FLIGHT COSTS TO BE REALISTIC FOR ${params.flightClass?.toUpperCase()} CLASS.
Do NOT suppress flight costs to fit a budget.`;
            }

            const retryResult = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: retryPrompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.5,
                },
            });

            const retryText = retryResult.response.text();
            const retryPrediction = validateAndParseOutput(retryText);

            if (!retryPrediction) {
                return {
                    success: false,
                    error: "Failed to generate valid prediction after retry",
                };
            }

            prediction = retryPrediction;
        }

        return {
            success: true,
            prediction,
        };

    } catch (error) {
        console.error("[GeminiBudget] Error generating prediction:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Check for specific error types
        if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
            return {
                success: false,
                error: "AI service is temporarily rate limited. Please try again in a few moments.",
            };
        }

        if (errorMessage.includes("UNAVAILABLE") || errorMessage.includes("503")) {
            return {
                success: false,
                error: "AI service is temporarily unavailable. Please try again later.",
            };
        }

        return {
            success: false,
            error: `Failed to generate prediction: ${errorMessage}`,
        };
    }
}

// Generate prediction for multiple destinations
export async function generateMultiDestinationPrediction(
    destinations: string[],
    params: Omit<PredictionParams, 'destination' | 'destinations'>
): Promise<{
    success: boolean;
    predictions?: { destination: string; prediction: GeminiPredictionOutput }[];
    error?: string;
}> {
    const results: { destination: string; prediction: GeminiPredictionOutput }[] = [];

    // Calculate days per destination (simple equal split)
    const totalDays = calculateDays(params.startDate, params.endDate);
    const daysPerDestination = Math.max(1, Math.floor(totalDays / destinations.length));

    for (const destination of destinations) {
        const result = await generateBudgetPrediction({
            ...params,
            destination,
            // Adjust dates for per-destination calculation
            startDate: params.startDate,
            endDate: new Date(
                new Date(params.startDate).getTime() +
                (daysPerDestination - 1) * 24 * 60 * 60 * 1000
            ).toISOString().split('T')[0],
        });

        if (!result.success || !result.prediction) {
            return {
                success: false,
                error: `Failed to generate prediction for ${destination}: ${result.error}`,
            };
        }

        results.push({ destination, prediction: result.prediction });
    }

    return {
        success: true,
        predictions: results,
    };
}
