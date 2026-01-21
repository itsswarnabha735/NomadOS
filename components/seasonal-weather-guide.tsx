"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Thermometer,
    Droplets,
    Sun,
    CloudRain,
    Wind,
    Lightbulb,
    Calendar,
    Clock,
    AlertCircle
} from "lucide-react";
import type { AIWeatherIntelligence } from "@/types/weather";
import { seasonBadgeColors, precipitationDisplay } from "@/types/weather";

interface SeasonalWeatherGuideProps {
    data: AIWeatherIntelligence;
    destination: string;
    startDate: string;
    endDate: string;
    daysUntilTrip: number;
}

export function SeasonalWeatherGuide({
    data,
    destination,
    startDate,
    endDate,
    daysUntilTrip
}: SeasonalWeatherGuideProps) {
    const seasonColors = seasonBadgeColors[data.seasonType] || seasonBadgeColors.shoulder;
    const precipColors = precipitationDisplay[data.precipitation.likelihood] || precipitationDisplay.moderate;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Sun className="h-6 w-6 text-yellow-500" />
                    <h2 className="text-xl font-semibold">Seasonal Weather Guide</h2>
                </div>
                <p className="text-muted-foreground">
                    {destination} • {startDate} to {endDate}
                </p>
                <div className="flex items-center justify-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${seasonColors.bg} ${seasonColors.text}`}>
                        {seasonColors.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        ~{daysUntilTrip} days away
                    </span>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="text-blue-900 dark:text-blue-50">
                        Weather forecasts are available 5 days in advance. This is an AI-generated
                        seasonal guide based on historical climate data for your destination.
                    </p>
                </div>
            </div>

            {/* Climate Overview */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Climate Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                        {data.climateOverview}
                    </p>
                </CardContent>
            </Card>

            {/* Temperature & Precipitation Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Temperature Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Thermometer className="h-4 w-4" />
                            Temperature Expectations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-blue-500">
                                    {data.temperatureRange.low}°C
                                </div>
                                <div className="text-xs text-muted-foreground">Low</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-green-500">
                                    {data.temperatureRange.average}°C
                                </div>
                                <div className="text-xs text-muted-foreground">Average</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-orange-500">
                                    {data.temperatureRange.high}°C
                                </div>
                                <div className="text-xs text-muted-foreground">High</div>
                            </div>
                        </div>
                        {data.temperatureRange.feelsLike && (
                            <p className="text-xs text-muted-foreground text-center mt-3">
                                {data.temperatureRange.feelsLike}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Precipitation Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Droplets className="h-4 w-4" />
                            Precipitation Outlook
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className={`font-medium ${precipColors.color}`}>
                                {precipColors.label}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                ~{data.precipitation.percentage}% chance
                            </span>
                        </div>

                        {/* Rain probability bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${data.precipitation.percentage}%` }}
                            />
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>• Pattern: {data.precipitation.pattern}</p>
                            <p>• Monthly Avg: {data.precipitation.monthlyAverage}</p>
                            <p>• Humidity: {data.precipitation.humidity}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Patterns */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Daily Weather Patterns
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                            <div className="text-lg mb-1">🌅</div>
                            <div className="font-medium text-sm">Morning</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.hourlyPatterns.morning}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                            <div className="text-lg mb-1">☀️</div>
                            <div className="font-medium text-sm">Afternoon</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.hourlyPatterns.afternoon}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                            <div className="text-lg mb-1">🌆</div>
                            <div className="font-medium text-sm">Evening</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.hourlyPatterns.evening}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                            <div className="text-lg mb-1">🌙</div>
                            <div className="font-medium text-sm">Night</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.hourlyPatterns.night}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* UV Index & Tips Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* UV Index */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            UV Index
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl font-bold">
                                {data.uvIndex.value}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${data.uvIndex.level === 'extreme' ? 'bg-red-100 text-red-800' :
                                data.uvIndex.level === 'very_high' ? 'bg-orange-100 text-orange-800' :
                                    data.uvIndex.level === 'high' ? 'bg-yellow-100 text-yellow-800' :
                                        data.uvIndex.level === 'moderate' ? 'bg-green-100 text-green-800' :
                                            'bg-blue-100 text-blue-800'
                                }`}>
                                {data.uvIndex.level.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.uvIndex.recommendation}
                        </p>
                    </CardContent>
                </Card>

                {/* Best Time Comparison */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Best Time Comparison
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-lg ${data.bestTimeToVisit.isOptimal ? '✅' : '🔶'}`}>
                                {data.bestTimeToVisit.isOptimal ? '✅' : '🔶'}
                            </span>
                            <span className="text-sm font-medium">
                                {data.bestTimeToVisit.isOptimal ? 'Optimal Season' : 'Good Alternative'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.bestTimeToVisit.comparison}
                        </p>
                        {data.bestTimeToVisit.optimalMonths.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Best months: {data.bestTimeToVisit.optimalMonths.join(', ')}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Local Tips */}
            {data.localTips.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Local Weather Tips
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {data.localTips.map((tip, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="text-primary shrink-0">•</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Weather Events */}
            {data.weatherEvents.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CloudRain className="h-4 w-4" />
                            Seasonal Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.weatherEvents.map((event, index) => (
                                <div key={index} className="border-l-2 border-primary pl-3">
                                    <div className="font-medium text-sm">{event.event}</div>
                                    <p className="text-xs text-muted-foreground">{event.description}</p>
                                    {event.impact && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Impact: {event.impact}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Disclaimer */}
            <div className="text-center text-xs text-muted-foreground py-4 border-t">
                <p>
                    ⚠️ This is a seasonal estimate based on historical patterns, not a precise forecast.
                </p>
                <p className="mt-1">
                    Check back when your trip is within 5 days for accurate day-by-day predictions.
                </p>
                {data.confidence && (
                    <p className="mt-2 opacity-60">
                        Confidence: {Math.round(data.confidence * 100)}%
                    </p>
                )}
            </div>
        </div>
    );
}
