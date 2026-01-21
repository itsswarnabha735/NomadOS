// Prediction Tracker Service
// Track actual expenses against AI-predicted categories

import { Expense } from '@/types';
import { CategoryBreakdown } from '@/types/budget-prediction';

export interface CategoryComparison {
    category: string;
    predicted: number;
    actual: number;
    variance: number;       // actual - predicted
    variancePercent: number; // (actual - predicted) / predicted * 100
    status: 'on-track' | 'over' | 'under' | 'way-over';
    icon?: string;
}

export interface ActualsVsPredicted {
    totalPredicted: number;
    totalActual: number;
    totalVariance: number;
    totalVariancePercent: number;
    overallStatus: 'on-track' | 'over-budget' | 'under-budget' | 'way-over';
    categories: CategoryComparison[];
    daysElapsed: number;
    totalDays: number;
    projectedTotal?: number;  // Based on daily average
}

// Map expense categories to prediction categories
const CATEGORY_MAPPING: Record<string, string> = {
    // Standard mappings
    'food': 'Food',
    'food & dining': 'Food',
    'dining': 'Food',
    'restaurant': 'Food',
    'groceries': 'Food',

    'transport': 'Transport',
    'transportation': 'Transport',
    'taxi': 'Transport',
    'uber': 'Transport',
    'flights': 'Transport',
    'train': 'Transport',
    'bus': 'Transport',

    'accommodation': 'Accommodation',
    'hotel': 'Accommodation',
    'hostel': 'Accommodation',
    'airbnb': 'Accommodation',
    'lodging': 'Accommodation',

    'activities': 'Activities',
    'entertainment': 'Activities',
    'tours': 'Activities',
    'museum': 'Activities',
    'attractions': 'Activities',

    'shopping': 'Shopping',
    'souvenirs': 'Shopping',
    'gifts': 'Shopping',

    'other': 'Other',
    'misc': 'Other',
    'miscellaneous': 'Other',
};

/**
 * Normalize category name to match prediction categories
 */
function normalizeCategory(categoryName: string): string {
    const lower = categoryName.toLowerCase().trim();
    return CATEGORY_MAPPING[lower] || 'Other';
}

/**
 * Determine status based on variance
 */
function getStatus(variancePercent: number): 'on-track' | 'over' | 'under' | 'way-over' {
    if (variancePercent >= 50) return 'way-over';
    if (variancePercent > 15) return 'over';
    if (variancePercent < -15) return 'under';
    return 'on-track';
}

/**
 * Calculate actuals vs predicted comparison
 */
export function calculateActualsComparison(
    predictedCategories: CategoryBreakdown[],
    expenses: Expense[],
    tripStartDate: string,
    tripEndDate: string
): ActualsVsPredicted {
    // Calculate days
    const start = new Date(tripStartDate);
    const end = new Date(tripEndDate);
    const today = new Date();

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.max(0, Math.min(
        totalDays,
        Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    ));

    // Sum expenses by category
    const actualsByCategory: Record<string, number> = {};
    let totalActual = 0;

    for (const expense of expenses) {
        const normalizedCategory = normalizeCategory(expense.category);
        actualsByCategory[normalizedCategory] = (actualsByCategory[normalizedCategory] || 0) + expense.amount;
        totalActual += expense.amount;
    }

    // Calculate predicted total
    const totalPredicted = predictedCategories.reduce((sum, cat) => sum + cat.amount, 0);

    // Build category comparisons
    const categories: CategoryComparison[] = predictedCategories.map(predCat => {
        const actual = actualsByCategory[predCat.category] || 0;
        const variance = actual - predCat.amount;
        const variancePercent = predCat.amount > 0
            ? Math.round((variance / predCat.amount) * 100)
            : (actual > 0 ? 100 : 0);

        return {
            category: predCat.category,
            predicted: predCat.amount,
            actual,
            variance,
            variancePercent,
            status: getStatus(variancePercent),
            icon: predCat.icon,
        };
    });

    // Handle expenses in categories not in prediction
    const predictedCategoryNames = new Set(predictedCategories.map(c => c.category));
    for (const [category, amount] of Object.entries(actualsByCategory)) {
        if (!predictedCategoryNames.has(category)) {
            categories.push({
                category,
                predicted: 0,
                actual: amount,
                variance: amount,
                variancePercent: 100,
                status: 'over',
            });
        }
    }

    // Overall metrics
    const totalVariance = totalActual - totalPredicted;
    const totalVariancePercent = totalPredicted > 0
        ? Math.round((totalVariance / totalPredicted) * 100)
        : 0;

    // Project total based on current spending rate
    let projectedTotal: number | undefined;
    if (daysElapsed > 0 && daysElapsed < totalDays) {
        const dailyActual = totalActual / daysElapsed;
        projectedTotal = Math.round(dailyActual * totalDays);
    }

    // Determine overall status
    let overallStatus: 'on-track' | 'over-budget' | 'under-budget' | 'way-over';
    if (totalVariancePercent >= 30) {
        overallStatus = 'way-over';
    } else if (totalVariancePercent > 10) {
        overallStatus = 'over-budget';
    } else if (totalVariancePercent < -20) {
        overallStatus = 'under-budget';
    } else {
        overallStatus = 'on-track';
    }

    return {
        totalPredicted,
        totalActual,
        totalVariance,
        totalVariancePercent,
        overallStatus,
        categories,
        daysElapsed,
        totalDays,
        projectedTotal,
    };
}

/**
 * Get a summary message for the comparison
 */
export function getComparisonSummary(comparison: ActualsVsPredicted): string {
    const { overallStatus, totalVariancePercent, daysElapsed, totalDays, projectedTotal } = comparison;

    const progress = Math.round((daysElapsed / totalDays) * 100);

    switch (overallStatus) {
        case 'on-track':
            return `Day ${daysElapsed}/${totalDays} (${progress}%): You're on track with your budget! Spending is within prediction.`;
        case 'under-budget':
            return `Day ${daysElapsed}/${totalDays} (${progress}%): Great job! You're ${Math.abs(totalVariancePercent)}% under predicted spending.`;
        case 'over-budget':
            return `Day ${daysElapsed}/${totalDays} (${progress}%): Heads up - you're ${totalVariancePercent}% over predicted spending.${projectedTotal ? ` At this rate, total will be ~${projectedTotal.toLocaleString()}` : ''}`;
        case 'way-over':
            return `Day ${daysElapsed}/${totalDays} (${progress}%): Warning! Spending is ${totalVariancePercent}% over prediction. Consider adjusting categories.`;
    }
}
