import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface WeatherForecast {
    date: string;
    temp: number;
    description: string;
    pop: number; // Probability of precipitation
}

interface PackingSuggestionRequest {
    destination: string;
    startDate: string;
    endDate: string;
    weatherForecast: WeatherForecast[];
    existingItems?: string[];
}

export async function POST(request: NextRequest) {
    try {
        // Check for API key
        if (!process.env.GEMINI_API_KEY) {
            console.error("[PackingSuggestions] GEMINI_API_KEY not configured");
            return NextResponse.json(
                { error: "AI service not configured" },
                { status: 500 }
            );
        }

        const body: PackingSuggestionRequest = await request.json();
        const { destination, startDate, endDate, weatherForecast, existingItems = [] } = body;

        console.log("[PackingSuggestions] Request for:", destination);

        if (!destination || !startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing required fields: destination, startDate, endDate" },
                { status: 400 }
            );
        }

        // Calculate weather summary
        const avgTemp = weatherForecast.length > 0
            ? Math.round(weatherForecast.reduce((sum, w) => sum + w.temp, 0) / weatherForecast.length)
            : null; // null indicates no real forecast data
        const maxRainProb = weatherForecast.length > 0
            ? Math.max(...weatherForecast.map(w => w.pop))
            : null;
        const conditions = weatherForecast.length > 0
            ? [...new Set(weatherForecast.map(w => w.description))]
            : [];

        // Calculate trip duration
        const start = new Date(startDate);
        const end = new Date(endDate);
        const tripDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Determine the travel month and season for context
        const travelMonth = start.toLocaleDateString('en-US', { month: 'long' });
        const hasRealForecast = avgTemp !== null;

        // Build the AI prompt
        const weatherSection = hasRealForecast
            ? `- **Weather Forecast (Real-time):**
  - Average Temperature: ${avgTemp}°C
  - Max Rain Probability: ${maxRainProb}%
  - Conditions: ${conditions.join(", ") || "Unknown"}`
            : `- **Weather (Seasonal Estimate):**
  - Travel Month: ${travelMonth}
  - Note: Trip is beyond 5-day forecast window. Use your knowledge of typical ${travelMonth} weather in ${destination} for packing recommendations.`;

        const prompt = `You are a smart travel packing assistant. Generate a personalized packing list for a trip.

## Trip Details:
- **Destination:** ${destination}
- **Duration:** ${tripDays} days (${startDate} to ${endDate})
${weatherSection}

## User Already Has These Items (DO NOT SUGGEST):
${existingItems.length > 0 ? existingItems.map(item => `- ${item}`).join("\n") : "- None specified"}

## Instructions:
1. Suggest practical packing items for this trip
2. Consider the weather ${hasRealForecast ? 'forecast' : `typical for ${travelMonth} in ${destination}`} when suggesting items
3. Consider the destination's culture, activities, and unique needs
4. For items affected by weather, include a brief "weatherReason" explaining why
5. Suggest appropriate quantities based on trip duration
6. Categorize each item into one of these categories:
   - clothing, toiletries, electronics, documents, health, accessories, weather_gear, destination_specific

## Response Format (JSON only, no markdown):
{
  "suggestions": [
    {
      "name": "Item name",
      "category": "category_name",
      "quantity": 1,
      "weatherReason": "Optional reason related to weather"
    }
  ]
}

Generate 15-25 helpful packing suggestions. Be specific and practical. Only respond with valid JSON.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean up the response (remove markdown code blocks if present)
        let cleanedText = text.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.slice(7);
        } else if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.slice(0, -3);
        }
        cleanedText = cleanedText.trim();

        // Parse the AI response
        let aiResponse;
        try {
            aiResponse = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Failed to parse AI response:", cleanedText);
            return NextResponse.json(
                { error: "Failed to parse AI suggestions" },
                { status: 500 }
            );
        }

        // Validate and normalize category names
        const validCategories = [
            'clothing', 'toiletries', 'electronics', 'documents',
            'health', 'accessories', 'weather_gear', 'destination_specific', 'custom'
        ];

        const normalizedSuggestions = (aiResponse.suggestions || []).map((item: any) => ({
            name: item.name || "Unknown Item",
            category: validCategories.includes(item.category) ? item.category : 'custom',
            quantity: item.quantity || 1,
            weatherReason: item.weatherReason || undefined
        }));

        return NextResponse.json({
            suggestions: normalizedSuggestions,
            weatherSummary: {
                avgTemp: avgTemp ?? 20, // Default to 20°C if no forecast
                rainProbability: maxRainProb ?? 0,
                conditions
            }
        });

    } catch (error) {
        console.error("Error generating packing suggestions:", error);
        return NextResponse.json(
            { error: "Failed to generate packing suggestions" },
            { status: 500 }
        );
    }
}
