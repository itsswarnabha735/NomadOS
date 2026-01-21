"use client";

import { CategoryBreakdown as CategoryBreakdownType, getCategoryIcon } from "@/types/budget-prediction";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/exchange-rate-service";
import { Lightbulb } from "lucide-react";

interface CategoryBreakdownProps {
    categories: CategoryBreakdownType[];
    currency: string;
    localCurrency?: string;
    savingTips?: string[];
}

export function CategoryBreakdown({
    categories,
    currency,
    localCurrency,
    savingTips
}: CategoryBreakdownProps) {
    // Sort by percentage descending
    const sortedCategories = [...categories].sort((a, b) => b.percentage - a.percentage);

    // Color mapping for categories
    const categoryColors: Record<string, string> = {
        'food': 'bg-orange-500',
        'food & dining': 'bg-orange-500',
        'transport': 'bg-blue-500',
        'transportation': 'bg-blue-500',
        'accommodation': 'bg-purple-500',
        'activities': 'bg-green-500',
        'shopping': 'bg-pink-500',
        'other': 'bg-gray-500',
        'flights': 'bg-cyan-500',
    };

    const getColor = (category: string) => {
        const normalized = category.toLowerCase();
        return categoryColors[normalized] || 'bg-gray-400';
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {sortedCategories.map((cat, index) => (
                    <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{cat.icon || getCategoryIcon(cat.category)}</span>
                                <span className="font-medium">{cat.category}</span>
                                {cat.isCustomCategory && (
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        AI Suggested
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="font-semibold">
                                    {formatCurrency(cat.amount, currency)}
                                </span>
                                <span className="text-muted-foreground ml-2">
                                    {cat.percentage}%
                                </span>
                            </div>
                        </div>
                        <Progress
                            value={cat.percentage}
                            className={`h-2 ${getColor(cat.category)}`}
                        />
                        {localCurrency && cat.localAmount && (
                            <p className="text-xs text-muted-foreground text-right">
                                ≈ {formatCurrency(cat.localAmount, localCurrency)} {localCurrency}
                            </p>
                        )}
                    </div>
                ))}

                {/* Total */}
                <div className="pt-3 border-t flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span>
                        {formatCurrency(
                            categories.reduce((sum, cat) => sum + cat.amount, 0),
                            currency
                        )}
                    </span>
                </div>

                {/* Saving Tips */}
                {savingTips && savingTips.length > 0 && (
                    <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            <span>Saving Tips</span>
                        </div>
                        <ul className="space-y-2">
                            {savingTips.map((tip, index) => (
                                <li
                                    key={index}
                                    className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md"
                                >
                                    💡 {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
