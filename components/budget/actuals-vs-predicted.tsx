"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    Target,
    AlertTriangle,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { ActualsVsPredicted, CategoryComparison, getComparisonSummary } from "@/lib/prediction-tracker";

interface ActualsVsPredictedCardProps {
    comparison: ActualsVsPredicted;
    currency: string;
}

const statusColors = {
    'on-track': 'bg-green-500',
    'over': 'bg-amber-500',
    'under': 'bg-blue-500',
    'way-over': 'bg-red-500',
    'over-budget': 'bg-amber-500',
    'under-budget': 'bg-blue-500',
};

const statusBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'on-track': 'default',
    'over': 'secondary',
    'under': 'outline',
    'way-over': 'destructive',
    'over-budget': 'secondary',
    'under-budget': 'outline',
};

function CategoryRow({ category, currency }: { category: CategoryComparison; currency: string }) {
    const isOver = category.variance > 0;
    const progressPercent = category.predicted > 0
        ? Math.min(100, (category.actual / category.predicted) * 100)
        : (category.actual > 0 ? 100 : 0);

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    <span className="font-medium">{category.category}</span>
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{currency} {category.actual.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/ {category.predicted.toLocaleString()}</span>
                    {category.variance !== 0 && (
                        <Badge
                            variant={category.status === 'way-over' ? 'destructive' : category.status === 'over' ? 'secondary' : 'outline'}
                            className="text-xs px-1 py-0"
                        >
                            {isOver ? '+' : ''}{category.variancePercent}%
                        </Badge>
                    )}
                </div>
            </div>
            <div className="relative">
                <Progress
                    value={Math.min(progressPercent, 100)}
                    className="h-2"
                />
                {progressPercent > 100 && (
                    <div
                        className="absolute top-0 left-0 h-2 bg-red-500/30 rounded-full"
                        style={{ width: '100%' }}
                    />
                )}
            </div>
        </div>
    );
}

export function ActualsVsPredictedCard({ comparison, currency }: ActualsVsPredictedCardProps) {
    const summary = getComparisonSummary(comparison);
    const isOver = comparison.totalVariance > 0;
    const tripProgress = Math.round((comparison.daysElapsed / comparison.totalDays) * 100);

    const StatusIcon = comparison.overallStatus === 'on-track'
        ? CheckCircle2
        : comparison.overallStatus === 'way-over'
            ? AlertTriangle
            : isOver ? TrendingUp : TrendingDown;

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Actuals vs Predicted
                    </CardTitle>
                    <Badge variant={statusBadgeVariants[comparison.overallStatus]}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {comparison.overallStatus.replace('-', ' ')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary Banner */}
                <div className={`p-3 rounded-lg ${comparison.overallStatus === 'on-track' ? 'bg-green-50 dark:bg-green-950/30' :
                        comparison.overallStatus === 'way-over' ? 'bg-red-50 dark:bg-red-950/30' :
                            comparison.overallStatus === 'over-budget' ? 'bg-amber-50 dark:bg-amber-950/30' :
                                'bg-blue-50 dark:bg-blue-950/30'
                    }`}>
                    <p className="text-sm">{summary}</p>
                </div>

                {/* Overall Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Trip Progress</span>
                        <span className="font-medium">
                            Day {comparison.daysElapsed} of {comparison.totalDays} ({tripProgress}%)
                        </span>
                    </div>
                    <Progress value={tripProgress} className="h-2" />
                </div>

                {/* Total Comparison */}
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Predicted Total</div>
                        <div className="text-lg font-bold">
                            {currency} {comparison.totalPredicted.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Actual So Far</div>
                        <div className="text-lg font-bold flex items-center gap-1">
                            {currency} {comparison.totalActual.toLocaleString()}
                            {isOver ? (
                                <ArrowUpRight className="h-4 w-4 text-red-500" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Projected Total */}
                {comparison.projectedTotal && comparison.daysElapsed < comparison.totalDays && (
                    <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">Projected Total (at current rate)</span>
                        <span className={`font-medium ${comparison.projectedTotal > comparison.totalPredicted
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                            {currency} {comparison.projectedTotal.toLocaleString()}
                        </span>
                    </div>
                )}

                {/* Category Breakdown */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">By Category</h4>
                    {comparison.categories.map((cat) => (
                        <CategoryRow key={cat.category} category={cat} currency={currency} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
