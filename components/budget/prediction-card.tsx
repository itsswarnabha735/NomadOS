"use client";

import { BudgetPredictionResponse } from "@/types/budget-prediction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getCurrencySymbol } from "@/lib/exchange-rate-service";
import {
    Sparkles,
    MapPin,
    Calendar,
    Users,
    TrendingUp,
    Check,
    X,
    Settings
} from "lucide-react";

interface PredictionCardProps {
    prediction: NonNullable<BudgetPredictionResponse['prediction']>;
    destination: string;
    destinations?: string[];
    days: number;
    participants: number;
    travelStyle: string;
    onApply: () => void;
    onCustomize: () => void;
    onDismiss: () => void;
}

export function PredictionCard({
    prediction,
    destination,
    destinations,
    days,
    participants,
    travelStyle,
    onApply,
    onCustomize,
    onDismiss,
}: PredictionCardProps) {
    const { totalCost, dailyAverage, perPersonCost, confidence, confidenceScore } = prediction;

    // Format travel style for display
    const styleLabels: Record<string, string> = {
        budget: '💸 Budget',
        midrange: '💰 Mid-Range',
        premium: '💎 Premium',
    };

    // Confidence colors
    const confidenceColors: Record<string, string> = {
        high: 'bg-green-500',
        medium: 'bg-yellow-500',
        low: 'bg-orange-500',
    };

    const displayDestination = destinations?.length
        ? destinations.join(' → ')
        : destination;

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">AI Budget Prediction</CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onDismiss}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Trip Summary */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate max-w-[200px]">{displayDestination}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{days} Days</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{participants} {participants === 1 ? 'Person' : 'People'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{styleLabels[travelStyle] || travelStyle}</span>
                    </div>
                </div>

                {/* Main Cost Display */}
                <div className="bg-background rounded-lg p-4 space-y-3">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Predicted Total</p>
                        <p className="text-3xl font-bold text-primary">
                            {formatCurrency(totalCost.amount, totalCost.currency)}
                        </p>
                        {totalCost.localCurrency !== totalCost.currency && (
                            <p className="text-sm text-muted-foreground mt-1">
                                ≈ {formatCurrency(totalCost.localAmount, totalCost.localCurrency)} {totalCost.localCurrency}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Daily Average</p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(dailyAverage, totalCost.currency)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Per Person</p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(perPersonCost, totalCost.currency)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Exchange Rate Info */}
                <div className="text-xs text-muted-foreground text-center">
                    💱 Exchange Rate: 1 {totalCost.localCurrency} = {getCurrencySymbol(totalCost.currency)}{totalCost.exchangeRate.toFixed(4)} {totalCost.currency}
                    <span className="opacity-75"> (as of {totalCost.exchangeRateDate})</span>
                </div>

                {/* Confidence Indicator */}
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full ${confidenceColors[confidence]} transition-all`}
                                style={{ width: `${confidenceScore}%` }}
                            />
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {confidenceScore}% ({confidence})
                        </Badge>
                    </div>
                </div>

                {/* Seasonal Info */}
                {prediction.seasonalFactors && (
                    <div className="text-sm text-center p-2 bg-muted/50 rounded-md">
                        {prediction.seasonalFactors.isPeakSeason ? (
                            <span className="text-orange-600">
                                🌡️ Peak Season - {prediction.seasonalFactors.reason}
                            </span>
                        ) : (
                            <span className="text-green-600">
                                ✨ {prediction.seasonalFactors.reason || 'Good time to visit!'}
                            </span>
                        )}
                    </div>
                )}

                {/* Multi-destination Breakdown */}
                {prediction.destinationBreakdown && prediction.destinationBreakdown.length > 1 && (
                    <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-2">Per Destination:</p>
                        <div className="space-y-1">
                            {prediction.destinationBreakdown.map((dest, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{dest.destination}</span>
                                    <span>
                                        {formatCurrency(dest.totalCost * totalCost.exchangeRate, totalCost.currency)}
                                        <span className="text-xs text-muted-foreground ml-1">
                                            ({dest.days} days)
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    <Button onClick={onApply} className="flex-1">
                        <Check className="mr-2 h-4 w-4" />
                        Apply to Budget
                    </Button>
                    <Button onClick={onCustomize} variant="outline">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
