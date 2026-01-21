"use client";

import { AlertTriangle, ArrowUp, TrendingDown, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/exchange-rate-service";

interface BudgetGapAlertProps {
    userBudget: number;
    predictedCost: number;
    currency: string;
    recommendation: string;
    onIncreaseBudget: () => void;
    onAdjustStyle: () => void;
    onKeepCurrent: () => void;
}

export function BudgetGapAlert({
    userBudget,
    predictedCost,
    currency,
    recommendation,
    onIncreaseBudget,
    onAdjustStyle,
    onKeepCurrent,
}: BudgetGapAlertProps) {
    const gap = predictedCost - userBudget;
    const gapPercentage = Math.round((gap / userBudget) * 100);
    const isOverBudget = gap > 0;
    const isSignificant = Math.abs(gapPercentage) > 10;

    if (!isSignificant) {
        return null;  // Don't show alert for small gaps
    }

    return (
        <Card className={`${isOverBudget ? 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20' : 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'}`}>
            <CardContent className="pt-4">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                        {isOverBudget ? (
                            <>
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                <span className="font-semibold text-orange-700 dark:text-orange-400">
                                    Budget Gap Detected
                                </span>
                            </>
                        ) : (
                            <>
                                <TrendingDown className="h-5 w-5 text-green-500" />
                                <span className="font-semibold text-green-700 dark:text-green-400">
                                    Under Budget
                                </span>
                            </>
                        )}
                    </div>

                    {/* Comparison */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Your Budget</p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(userBudget, currency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">AI Prediction</p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(predictedCost, currency)}
                            </p>
                        </div>
                    </div>

                    {/* Gap Display */}
                    <div className={`p-3 rounded-md ${isOverBudget ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {isOverBudget ? 'Short by' : 'Buffer of'}
                            </span>
                            <span className={`text-lg font-bold ${isOverBudget ? 'text-orange-600' : 'text-green-600'}`}>
                                {formatCurrency(Math.abs(gap), currency)} ({Math.abs(gapPercentage)}%)
                            </span>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <p className="text-sm text-muted-foreground">
                        💡 {recommendation}
                    </p>

                    {/* Action Buttons */}
                    {isOverBudget && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                onClick={onIncreaseBudget}
                                className="flex-1"
                            >
                                <ArrowUp className="mr-1 h-4 w-4" />
                                Increase Budget
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onAdjustStyle}
                                className="flex-1"
                            >
                                Adjust Style
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onKeepCurrent}
                            >
                                <Check className="mr-1 h-4 w-4" />
                                Keep Current
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
