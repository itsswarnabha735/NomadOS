// AI Weather Intelligence Types
// These types support the seasonal weather guide feature for trips beyond the 5-day API forecast window

export type WeatherSource = 'api' | 'ai';

export interface WeatherResult {
    source: WeatherSource;
    data: APIForecast[] | AIWeatherIntelligence;
}

export interface APIForecast {
    date: string;
    temp: number;
    description: string;
    icon: string;
    pop: number;
}

export interface AIWeatherIntelligence {
    climateOverview: string;
    temperatureRange: TemperatureRange;
    precipitation: PrecipitationInfo;
    seasonType: SeasonType;
    seasonLabel: string;
    uvIndex: UVIndexInfo;
    localTips: string[];
    weatherEvents: WeatherEvent[];
    hourlyPatterns: HourlyPatterns;
    bestTimeToVisit: BestTimeInfo;
    confidence: number;
    generatedAt: string;
}

export interface TemperatureRange {
    low: number;
    average: number;
    high: number;
    feelsLike?: string;
    unit: 'celsius' | 'fahrenheit';
}

export interface PrecipitationInfo {
    likelihood: PrecipitationLikelihood;
    percentage: number;
    pattern: string;
    monthlyAverage: string;
    humidity: string;
}

export type PrecipitationLikelihood = 'none' | 'low' | 'moderate' | 'high' | 'very_high';

export type SeasonType =
    | 'dry'
    | 'wet'
    | 'monsoon'
    | 'shoulder'
    | 'winter'
    | 'summer'
    | 'spring'
    | 'autumn'
    | 'tropical_wet'
    | 'tropical_dry';

export interface UVIndexInfo {
    level: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
    value: number;
    recommendation: string;
}

export interface WeatherEvent {
    event: string;
    description: string;
    impact?: string;
}

export interface HourlyPatterns {
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
}

export interface BestTimeInfo {
    isOptimal: boolean;
    optimalMonths: string[];
    comparison: string;
}

// Season badge colors for UI
export const seasonBadgeColors: Record<SeasonType, { bg: string; text: string; label: string }> = {
    dry: { bg: 'bg-green-100', text: 'text-green-800', label: '🟢 Dry Season' },
    wet: { bg: 'bg-blue-100', text: 'text-blue-800', label: '🔵 Wet Season' },
    monsoon: { bg: 'bg-red-100', text: 'text-red-800', label: '🔴 Monsoon Season' },
    shoulder: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '🟡 Shoulder Season' },
    winter: { bg: 'bg-blue-100', text: 'text-blue-800', label: '❄️ Winter' },
    summer: { bg: 'bg-orange-100', text: 'text-orange-800', label: '☀️ Summer' },
    spring: { bg: 'bg-pink-100', text: 'text-pink-800', label: '🌸 Spring' },
    autumn: { bg: 'bg-amber-100', text: 'text-amber-800', label: '🍂 Autumn' },
    tropical_wet: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: '🌧️ Tropical Wet' },
    tropical_dry: { bg: 'bg-lime-100', text: 'text-lime-800', label: '🌴 Tropical Dry' },
};

// Precipitation likelihood display info
export const precipitationDisplay: Record<PrecipitationLikelihood, { label: string; color: string }> = {
    none: { label: 'No Rain Expected', color: 'text-green-600' },
    low: { label: 'Low Chance of Rain', color: 'text-green-500' },
    moderate: { label: 'Moderate Rainfall', color: 'text-yellow-600' },
    high: { label: 'High Rainfall', color: 'text-orange-600' },
    very_high: { label: 'Heavy Rainfall', color: 'text-red-600' },
};
