"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
    AIWeatherIntelligence,
    SeasonType,
    WeatherResult,
    APIForecast
} from "@/types/weather";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Month names for display
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export async function getWeather(query: string) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new Error("OpenWeather API Key is missing");
    }

    try {
        // 1. Geocode the city name
        const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData || geoData.length === 0) {
            return [];
        }

        const { lat, lon } = geoData[0];

        // 2. Fetch Forecast
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

        if (!res.ok) {
            throw new Error(`Weather API error: ${res.statusText}`);
        }
        const data = await res.json();

        // Filter to get one forecast per day (e.g., noon)
        const dailyForecasts = data.list.filter((item: any) => item.dt_txt.includes("12:00:00"));

        return dailyForecasts.slice(0, 5).map((item: any) => ({
            date: item.dt_txt.split(" ")[0],
            temp: Math.round(item.main.temp),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            pop: Math.round(item.pop * 100), // Probability of precipitation
        }));
    } catch (error) {
        console.error("Error fetching weather:", error);
        return [];
    }
}

export async function getWeatherForLocation(lat: number, lng: number, targetDate: string) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new Error("OpenWeather API Key is missing");
    }

    try {
        // Fetch Forecast for the specific coordinates
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

        if (!res.ok) {
            throw new Error(`Weather API error: ${res.statusText}`);
        }
        const data = await res.json();

        // Filter to find the forecast closest to the target date
        const target = new Date(targetDate);
        const targetDateStr = target.toISOString().split('T')[0]; // YYYY-MM-DD

        // Find all forecasts for the target date
        const targetForecasts = data.list.filter((item: any) => {
            const forecastDate = item.dt_txt.split(' ')[0];
            return forecastDate === targetDateStr;
        });

        if (targetForecasts.length === 0) {
            // If no exact match, return null
            return null;
        }

        // Prefer the noon forecast, or the first available
        const noonForecast = targetForecasts.find((item: any) => item.dt_txt.includes('12:00:00'));
        const forecast = noonForecast || targetForecasts[0];

        return {
            date: forecast.dt_txt.split(" ")[0],
            temp: Math.round(forecast.main.temp),
            description: forecast.weather[0].description,
            icon: forecast.weather[0].icon,
            pop: Math.round(forecast.pop * 100), // Probability of precipitation
        };
    } catch (error) {
        console.error("Error fetching weather for location:", error);
        return null;
    }
}

export interface TripWeatherSummary {
    forecasts: {
        date: string;
        temp: number;
        description: string;
        icon: string;
        pop: number;
    }[];
    avgTemp: number;
    maxRainProbability: number;
    conditions: string[];
    isRealForecast?: boolean;  // true if data is from actual forecast, false if estimated
    tripDatesInfo?: string;    // Info about data source
    destination?: string;
    country?: string;
}

/**
 * Get weather data for a trip with automatic source selection
 * - If trip is within 5 days: Returns API forecast data
 * - If trip is beyond 5 days: Returns AI-generated seasonal intelligence
 */
export async function getWeatherForTrip(
    destination: string,
    startDate: string,
    endDate: string
): Promise<WeatherResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripStart = new Date(startDate);
    tripStart.setHours(0, 0, 0, 0);

    const daysUntilTrip = Math.ceil(
        (tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`[Weather] Destination: ${destination}, Days until trip: ${daysUntilTrip}`);

    // Automatic source selection
    if (daysUntilTrip >= 0 && daysUntilTrip <= 5) {
        // Within API forecast window - use real data
        console.log("[Weather] Using API forecast (trip within 5 days)");
        const summary = await getTripWeatherSummary(destination, startDate, endDate);

        return {
            source: 'api',
            data: summary?.forecasts || []
        };
    } else {
        // Beyond forecast window - use AI intelligence
        console.log("[Weather] Using AI intelligence (trip beyond 5 days)");
        const intelligence = await getAIWeatherIntelligence(destination, startDate, endDate);

        return {
            source: 'ai',
            data: intelligence
        };
    }
}

/**
 * Generate AI-powered seasonal weather intelligence for trips beyond the 5-day forecast window
 */
export async function getAIWeatherIntelligence(
    destination: string,
    startDate: string,
    endDate: string
): Promise<AIWeatherIntelligence> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    let latitude = 0;
    let longitude = 0;
    let country = '';

    // Try to get coordinates for the destination
    if (apiKey) {
        try {
            const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (geoData && geoData.length > 0) {
                latitude = geoData[0].lat;
                longitude = geoData[0].lon;
                country = geoData[0].country || '';
            }
        } catch (error) {
            console.error("[Weather AI] Error geocoding:", error);
        }
    }

    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);
    const month = tripStart.getMonth();
    const monthName = MONTH_NAMES[month];
    const daysUntilTrip = Math.ceil((tripStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = buildWeatherIntelligencePrompt(
            destination,
            country,
            startDate,
            endDate,
            monthName,
            daysUntilTrip,
            latitude,
            longitude
        );

        console.log("[Weather AI] Generating intelligence for:", destination, monthName);

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
            },
        });

        const responseText = result.response.text();
        const parsed = parseWeatherIntelligenceResponse(responseText);

        if (parsed) {
            return {
                ...parsed,
                generatedAt: new Date().toISOString()
            };
        }
    } catch (error) {
        console.error("[Weather AI] Error generating intelligence:", error);
    }

    // Return fallback data if AI generation fails
    return generateFallbackWeatherData(destination, latitude, month, startDate, endDate);
}

function buildWeatherIntelligencePrompt(
    destination: string,
    country: string,
    startDate: string,
    endDate: string,
    monthName: string,
    daysUntilTrip: number,
    latitude: number,
    longitude: number
): string {
    return `You are an expert meteorologist and travel advisor with extensive knowledge of global climate patterns.

TASK: Generate a seasonal weather intelligence report for a traveler.

DESTINATION: ${destination}${country ? `, ${country}` : ''}
TRAVEL DATES: ${startDate} to ${endDate}
TRAVEL MONTH: ${monthName}
COORDINATES: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}
DAYS UNTIL TRIP: ${daysUntilTrip}

Generate a detailed weather intelligence report in JSON format:

{
  "climateOverview": "<3-4 sentence engaging overview of expected weather during travel period. Be specific to this destination and month.>",
  
  "temperatureRange": {
    "low": <typical overnight low in Celsius>,
    "average": <average daytime temperature in Celsius>,
    "high": <typical afternoon high in Celsius>,
    "feelsLike": "<what it feels like with humidity, e.g., 'Feels like 35°C due to high humidity'>",
    "unit": "celsius"
  },
  
  "precipitation": {
    "likelihood": "<none|low|moderate|high|very_high>",
    "percentage": <0-100 estimated chance of rain>,
    "pattern": "<description like 'Brief afternoon showers' or 'All-day drizzle'>",
    "monthlyAverage": "<average rainfall like '250mm'>",
    "humidity": "<range like '75-85%'>"
  },
  
  "seasonType": "<dry|wet|monsoon|shoulder|winter|summer|spring|autumn>",
  "seasonLabel": "<local name like 'Sakura Season' or 'Southwest Monsoon'>",
  
  "uvIndex": {
    "level": "<low|moderate|high|very_high|extreme>",
    "value": <1-11 typical UV index>,
    "recommendation": "<sun protection advice>"
  },
  
  "localTips": [
    "<4-5 specific, actionable tips about weather, best timing for activities, regional variations, festivals, etc.>"
  ],
  
  "weatherEvents": [
    {
      "event": "<name of seasonal event or phenomenon>",
      "description": "<brief description>",
      "impact": "<how it affects travelers>"
    }
  ],
  
  "hourlyPatterns": {
    "morning": "<typical morning conditions and recommendations>",
    "afternoon": "<typical afternoon conditions>",
    "evening": "<typical evening conditions>",
    "night": "<typical night conditions>"
  },
  
  "bestTimeToVisit": {
    "isOptimal": <true if travel dates are optimal, false otherwise>,
    "optimalMonths": ["<list best months>"],
    "comparison": "<1-2 sentences comparing their dates to optimal, highlight positives>"
  },
  
  "confidence": <0.0-1.0>
}

GUIDELINES:
1. Be SPECIFIC to ${destination} in ${monthName} - avoid generic statements
2. Consider hemisphere for seasons (latitude: ${latitude.toFixed(1)})
3. Include local festivals/events coinciding with travel dates
4. Mention regional climate variations if applicable
5. Consider altitude effects for mountainous areas
6. Flag monsoon/cyclone/hurricane seasons appropriately
7. Frame "non-optimal" times positively (fewer crowds, lower prices)
8. Use local terminology for seasons when applicable

Return ONLY valid JSON, no additional text.`;
}

function parseWeatherIntelligenceResponse(text: string): Omit<AIWeatherIntelligence, 'generatedAt'> | null {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[Weather AI] No JSON found in response");
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!parsed.climateOverview || !parsed.temperatureRange || !parsed.precipitation) {
            console.error("[Weather AI] Missing required fields");
            return null;
        }

        return {
            climateOverview: parsed.climateOverview,
            temperatureRange: {
                low: parsed.temperatureRange.low || 20,
                average: parsed.temperatureRange.average || 25,
                high: parsed.temperatureRange.high || 30,
                feelsLike: parsed.temperatureRange.feelsLike,
                unit: 'celsius'
            },
            precipitation: {
                likelihood: parsed.precipitation.likelihood || 'moderate',
                percentage: parsed.precipitation.percentage || 50,
                pattern: parsed.precipitation.pattern || 'Variable conditions',
                monthlyAverage: parsed.precipitation.monthlyAverage || 'Unknown',
                humidity: parsed.precipitation.humidity || '50-70%'
            },
            seasonType: (parsed.seasonType as SeasonType) || 'shoulder',
            seasonLabel: parsed.seasonLabel || 'Seasonal Weather',
            uvIndex: parsed.uvIndex || { level: 'moderate', value: 5, recommendation: 'SPF 30 recommended' },
            localTips: parsed.localTips || ['Check local forecasts closer to your trip'],
            weatherEvents: parsed.weatherEvents || [],
            hourlyPatterns: parsed.hourlyPatterns || {
                morning: 'Variable conditions',
                afternoon: 'Variable conditions',
                evening: 'Variable conditions',
                night: 'Variable conditions'
            },
            bestTimeToVisit: parsed.bestTimeToVisit || {
                isOptimal: true,
                optimalMonths: [],
                comparison: 'Your travel dates offer a good experience'
            },
            confidence: parsed.confidence || 0.7
        };
    } catch (error) {
        console.error("[Weather AI] Error parsing response:", error);
        return null;
    }
}

function generateFallbackWeatherData(
    destination: string,
    latitude: number,
    month: number,
    startDate: string,
    endDate: string
): AIWeatherIntelligence {
    const hemisphere = latitude >= 0 ? 'northern' : 'southern';
    const season = getSeason(month, latitude) as SeasonType;
    const monthName = MONTH_NAMES[month];

    // Estimate base temperature based on latitude and season
    const latitudeAbs = Math.abs(latitude);
    let baseTemp = 25; // Default tropical

    if (latitudeAbs > 60) baseTemp = season === 'summer' ? 15 : -5;
    else if (latitudeAbs > 45) baseTemp = season === 'summer' ? 22 : 5;
    else if (latitudeAbs > 30) baseTemp = season === 'summer' ? 28 : 15;
    else if (latitudeAbs > 15) baseTemp = 28;
    else baseTemp = 30;

    return {
        climateOverview: `${destination} in ${monthName} typically experiences ${season} weather conditions. For detailed and accurate weather information, check local weather sources closer to your travel dates. General ${season} patterns for this region suggest ${baseTemp > 20 ? 'warm' : 'cool'} conditions.`,
        temperatureRange: {
            low: baseTemp - 8,
            average: baseTemp,
            high: baseTemp + 5,
            unit: 'celsius'
        },
        precipitation: {
            likelihood: 'moderate',
            percentage: 40,
            pattern: 'Variable conditions expected',
            monthlyAverage: 'Varies by region',
            humidity: '50-70%'
        },
        seasonType: season,
        seasonLabel: `${season.charAt(0).toUpperCase() + season.slice(1)} Season`,
        uvIndex: {
            level: latitudeAbs < 30 ? 'high' : 'moderate',
            value: latitudeAbs < 30 ? 8 : 5,
            recommendation: 'Sunscreen recommended for outdoor activities'
        },
        localTips: [
            'Check local weather forecasts closer to your travel dates for accurate conditions',
            'Pack layers to be prepared for temperature variations',
            `${season === 'monsoon' || season === 'wet' ? 'Bring rain gear and waterproof bags' : 'Light, comfortable clothing recommended'}`
        ],
        weatherEvents: [],
        hourlyPatterns: {
            morning: 'Typically pleasant, good for outdoor activities',
            afternoon: 'Warmest part of the day',
            evening: 'Temperatures begin to cool',
            night: 'Coolest period, comfortable for rest'
        },
        bestTimeToVisit: {
            isOptimal: true,
            optimalMonths: [],
            comparison: 'Every season offers unique experiences at this destination'
        },
        confidence: 0.3,
        generatedAt: new Date().toISOString()
    };
}

export async function getTripWeatherSummary(
    destination: string,
    tripStartDate?: string,
    tripEndDate?: string
): Promise<TripWeatherSummary | null> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new Error("OpenWeather API Key is missing");
    }

    try {
        // 1. Geocode the destination
        const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData || geoData.length === 0) {
            return null;
        }

        const { lat, lon, country } = geoData[0];

        // 2. Fetch Forecast (5-day forecast from OpenWeatherMap free tier)
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const res = await fetch(url, { next: { revalidate: 3600 } });

        if (!res.ok) {
            throw new Error(`Weather API error: ${res.statusText}`);
        }
        const data = await res.json();

        // Filter to get one forecast per day (noon)
        const dailyForecasts = data.list.filter((item: any) => item.dt_txt.includes("12:00:00"));

        let forecasts = dailyForecasts.slice(0, 5).map((item: any) => ({
            date: item.dt_txt.split(" ")[0],
            temp: Math.round(item.main.temp),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            pop: Math.round(item.pop * 100),
        }));

        // Check if trip dates fall within forecast window
        let isRealForecast = true;
        let tripDatesInfo = '';

        if (tripStartDate && tripEndDate) {
            const tripStart = new Date(tripStartDate);
            tripStart.setHours(0, 0, 0, 0); // Normalize to start of day
            const tripEnd = new Date(tripEndDate);
            tripEnd.setHours(23, 59, 59, 999); // Normalize to end of day
            const now = new Date();
            const forecastEndDate = new Date();
            forecastEndDate.setDate(forecastEndDate.getDate() + 5);

            // Filter forecasts to only include trip dates
            const tripForecasts = forecasts.filter((f: any) => {
                const forecastDate = new Date(f.date);
                forecastDate.setHours(12, 0, 0, 0); // Normalize to noon for comparison
                return forecastDate >= tripStart && forecastDate <= tripEnd;
            });

            // Always use filtered forecasts when trip dates are provided
            forecasts = tripForecasts;

            if (tripForecasts.length > 0) {
                // We have real forecast data for some/all trip days
                tripDatesInfo = `Real-time forecast for your trip dates`;
            } else if (tripStart > forecastEndDate) {
                // Trip is beyond forecast window - use seasonal guidance
                isRealForecast = false;
                const month = tripStart.getMonth();
                const season = getSeason(month, lat);
                tripDatesInfo = `Trip is ${Math.ceil((tripStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days away. Using ${season} seasonal data for ${destination}.`;
            } else {
                // Trip dates don't overlap with available forecast
                tripDatesInfo = `Weather forecast not available for your trip dates (${tripStartDate} - ${tripEndDate})`;
            }
        }

        // Calculate summary stats
        const avgTemp = forecasts.length > 0
            ? Math.round(forecasts.reduce((sum: number, f: any) => sum + f.temp, 0) / forecasts.length)
            : 20;
        const maxRainProbability = forecasts.length > 0
            ? Math.max(...forecasts.map((f: any) => f.pop))
            : 0;
        const conditions = [...new Set(forecasts.map((f: any) => f.description))] as string[];

        return {
            forecasts,
            avgTemp,
            maxRainProbability,
            conditions,
            isRealForecast,
            tripDatesInfo,
            destination,
            country
        };
    } catch (error) {
        console.error("Error fetching trip weather summary:", error);
        return null;
    }
}

// Helper function to determine season based on month and hemisphere
function getSeason(month: number, latitude: number): string {
    const isNorthernHemisphere = latitude >= 0;

    if (isNorthernHemisphere) {
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    } else {
        // Southern hemisphere - seasons are reversed
        if (month >= 2 && month <= 4) return 'autumn';
        if (month >= 5 && month <= 7) return 'winter';
        if (month >= 8 && month <= 10) return 'spring';
        return 'summer';
    }
}


