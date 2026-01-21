"use client";

import { TripBudgetSettings, Expense } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BudgetOverviewProps {
    settings: TripBudgetSettings;
    expenses: Expense[];
    currency: string;
}

export function BudgetOverview({ settings, expenses, currency }: BudgetOverviewProps) {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBudget = settings.totalCap || 0;
    const progress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const remaining = totalBudget - totalSpent;
    const isOverBudget = remaining < 0;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                    <span className="text-2xl font-bold">
                        {currency} {totalSpent.toFixed(2)}
                    </span>
                </CardHeader>
                <CardContent>
                    <Progress value={Math.min(progress, 100)} className={`h-2 mt-2 ${isOverBudget ? "bg-red-100" : ""}`} />
                    <p className="text-xs text-muted-foreground mt-2">
                        {progress.toFixed(1)}% of budget used
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                    <span className={`text-2xl font-bold ${isOverBudget ? "text-red-500" : "text-green-600"}`}>
                        {currency} {Math.abs(remaining).toFixed(2)}
                    </span>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground mt-2">
                        {isOverBudget ? "Over budget!" : "Available to spend"}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                    {/* Placeholder for daily average calculation */}
                    <span className="text-2xl font-bold">
                        {currency} {(totalSpent / (expenses.length || 1)).toFixed(2)}
                    </span>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground mt-2">
                        Per transaction (approx)
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
