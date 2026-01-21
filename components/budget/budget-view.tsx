"use client";

import { useEffect, useState, useMemo } from "react";
import { Trip, TripBudgetSettings, Expense, Settlement, Activity } from "@/types";
import { BudgetPredictionResponse, TravelStyle, AccommodationStyle, DiningStyle, ActivityPreference } from "@/types/budget-prediction";
import { subscribeToBudgetSettings, subscribeToExpenses, subscribeToSettlements, calculateBalances, updateBudgetSettings } from "@/lib/budget-service";
import { BudgetOverview } from "./budget-overview";
import { ExpenseList } from "./expense-list";
import { BudgetSettingsModal } from "./budget-settings-modal";
import { AddExpenseModal } from "./add-expense-modal";
import { BalancesView } from "./balances-view";
import { PredictionCard } from "./prediction-card";
import { CategoryBreakdown } from "./category-breakdown";
import { PredictionSettingsModal, FlightClass, TransportPreference } from "./prediction-settings-modal";
import { PredictionError } from "./prediction-error";
import { BudgetGapAlert } from "./budget-gap-alert";
import { ActualsVsPredictedCard } from "./actuals-vs-predicted";
import { calculateActualsComparison } from "@/lib/prediction-tracker";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Wallet, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, onSnapshot, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BudgetViewProps {
    trip: Trip;
    userId: string;
    activities: Activity[];
}

interface Participant {
    id: string;
    name: string;
}

export function BudgetView({ trip, userId, activities }: BudgetViewProps) {
    const [settings, setSettings] = useState<TripBudgetSettings | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [owner, setOwner] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [addExpenseOpen, setAddExpenseOpen] = useState(false);

    // Prediction state
    const [prediction, setPrediction] = useState<BudgetPredictionResponse['prediction'] | null>(null);
    const [predictionError, setPredictionError] = useState<string | null>(null);
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [predictionSettingsOpen, setPredictionSettingsOpen] = useState(false);
    const [showPrediction, setShowPrediction] = useState(false);
    // Store the settings used when generating the prediction
    const [lastPredictionSettings, setLastPredictionSettings] = useState<{
        participantCount: number;
        travelStyle: TravelStyle;
        flightClass: FlightClass;
        transportPreference: TransportPreference;
        accommodationStyle: AccommodationStyle;
        diningStyle: DiningStyle;
        activityPreference: ActivityPreference;
        origin?: string;
    }>({
        participantCount: 1,
        travelStyle: 'midrange',
        flightClass: 'economy',
        transportPreference: 'mixed',
        accommodationStyle: 'standard_hotel',
        diningStyle: 'casual_dining',
        activityPreference: 'standard_mixed'
    });

    useEffect(() => {
        const unsubSettings = subscribeToBudgetSettings(trip.id, (data) => {
            setSettings(data);
            setLoading(false);
        });

        const unsubExpenses = subscribeToExpenses(trip.id, (data) => {
            setExpenses(data);
        });

        const unsubSettlements = subscribeToSettlements(trip.id, (data) => {
            setSettlements(data);
        });

        // Subscribe to Participants
        const qParticipants = query(collection(db, "trips", trip.id, "participants"));
        const unsubParticipants = onSnapshot(qParticipants, (snapshot) => {
            const parts: Participant[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                parts.push({
                    id: doc.id,
                    name: data.userName || data.displayName || "Unknown"
                });
            });
            setParticipants(parts);
        });

        // Fetch Owner Profile separately
        if (trip.ownerId) {
            getDoc(doc(db, "users", trip.ownerId)).then((snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setOwner({
                        id: trip.ownerId!,
                        name: data.displayName || "Owner"
                    });
                }
            }).catch(err => console.error("Error fetching owner:", err));
        }

        return () => {
            unsubSettings();
            unsubExpenses();
            unsubSettlements();
            unsubParticipants();
        };
    }, [trip.id, userId, trip.ownerId]);

    // Combine participants and owner, ensuring current user is present
    const allParticipants = useMemo(() => {
        const combined = [...participants];

        // Add owner if not present
        if (owner && !combined.find(p => p.id === owner.id)) {
            combined.push(owner);
        }

        // Add current user if not present (fallback)
        if (!combined.find(p => p.id === userId)) {
            combined.push({ id: userId, name: "Me" });
        }

        return combined;
    }, [participants, owner, userId]);

    // Calculate trip days
    const tripDays = useMemo(() => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, [trip.startDate, trip.endDate]);

    // Generate prediction
    const handleGeneratePrediction = async (predSettings: {
        travelStyle: TravelStyle;
        participantCount: number;
        flightClass: FlightClass;
        transportPreference: TransportPreference;
        accommodationStyle: AccommodationStyle;
        diningStyle: DiningStyle;
        activityPreference: ActivityPreference;
        origin?: string;
    }) => {
        console.log('[BudgetView] handleGeneratePrediction called with:', predSettings);
        console.log('[BudgetView] Trip data:', {
            id: trip.id,
            destination: trip.destination,
            destinations: trip.destinations,
            startDate: trip.startDate,
            endDate: trip.endDate,
        });

        // Store the settings used for this prediction
        setLastPredictionSettings(predSettings);

        setPredictionLoading(true);
        setPredictionError(null);
        setPredictionSettingsOpen(false);

        try {
            const requestBody = {
                tripId: trip.id,
                destination: trip.destination,
                destinations: trip.destinations,
                startDate: trip.startDate,
                endDate: trip.endDate,
                travelStyle: predSettings.travelStyle,
                participantCount: predSettings.participantCount,
                flightClass: predSettings.flightClass,
                transportPreference: predSettings.transportPreference,
                accommodationStyle: predSettings.accommodationStyle,
                diningStyle: predSettings.diningStyle,
                activityPreference: predSettings.activityPreference,
                origin: predSettings.origin,
                userBaseCurrency: settings?.baseCurrency || 'INR',
                userBudget: settings?.totalCap,
            };

            console.log('[BudgetView] Sending request to /api/budget-predict:', requestBody);

            const response = await fetch('/api/budget-predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            console.log('[BudgetView] Response received, status:', response.status);

            const data: BudgetPredictionResponse = await response.json();
            console.log('[BudgetView] Response data:', data);

            if (!data.success || !data.prediction) {
                console.log('[BudgetView] Prediction failed:', data.error);
                setPredictionError(data.error?.message || 'Failed to generate prediction');
                setShowPrediction(true);
            } else {
                console.log('[BudgetView] Prediction success! Total:', data.prediction.totalCost);
                setPrediction(data.prediction);
                setShowPrediction(true);
            }
        } catch (error) {
            console.error('[BudgetView] Prediction error:', error);
            setPredictionError('Unable to connect to AI service. Please check your internet connection.');
            setShowPrediction(true);
        } finally {
            console.log('[BudgetView] Setting predictionLoading to false');
            setPredictionLoading(false);
        }
    };

    // Apply prediction to budget
    const handleApplyPrediction = async () => {
        if (!prediction || !settings) return;

        try {
            // Build update object, excluding undefined values
            const updateData: {
                totalCap: number;
                predictionApplied: boolean;
                travelStyle?: TravelStyle;
            } = {
                totalCap: prediction.totalCost.amount,
                predictionApplied: true,
            };

            // Only include travelStyle if it's defined
            if (!prediction.comparison && settings.travelStyle) {
                updateData.travelStyle = settings.travelStyle;
            }

            await updateBudgetSettings(trip.id, updateData);

            // Update category caps if categories exist
            // Use fuzzy matching to handle name variations (e.g., "Food" vs "Food & Drink")
            const categoryAliases: Record<string, string[]> = {
                'food': ['food', 'food & drink', 'dining', 'meals'],
                'transport': ['transport', 'transportation', 'local transport'],
                'accommodation': ['accommodation', 'hotels', 'lodging', 'stay'],
                'activities': ['activities', 'entertainment', 'tours'],
                'shopping': ['shopping', 'souvenirs'],
                'flights': ['flights', 'airfare', 'air travel'],
                'other': ['other', 'miscellaneous', 'misc'],
            };

            console.log('[BudgetView] Applying prediction - Settings categories:', settings.categories.map(c => c.name));
            console.log('[BudgetView] Applying prediction - Prediction categories:', prediction.categoryBreakdown.map(c => ({ category: c.category, amount: c.amount })));

            const updatedCategories = settings.categories.map(cat => {
                const catNameLower = cat.name.toLowerCase();

                // Find matching prediction category
                const predCat = prediction.categoryBreakdown.find(pc => {
                    const predCatLower = pc.category.toLowerCase();

                    // Direct match
                    if (predCatLower === catNameLower) return true;

                    // Check if one contains the other
                    if (catNameLower.includes(predCatLower) || predCatLower.includes(catNameLower)) return true;

                    // Check aliases
                    for (const [key, aliases] of Object.entries(categoryAliases)) {
                        const catMatches = aliases.some(a => catNameLower.includes(a) || a.includes(catNameLower));
                        const predMatches = aliases.some(a => predCatLower.includes(a) || a.includes(predCatLower));
                        if (catMatches && predMatches) return true;
                    }

                    return false;
                });

                if (predCat) {
                    console.log(`[BudgetView] Matched "${cat.name}" -> "${predCat.category}" = ${predCat.amount}`);
                    return { ...cat, cap: predCat.amount };
                } else {
                    console.log(`[BudgetView] No match for "${cat.name}"`);
                }
                return cat;
            });

            console.log('[BudgetView] Updated categories:', updatedCategories);
            await updateBudgetSettings(trip.id, { categories: updatedCategories });

            setShowPrediction(false);
            setPrediction(null);
        } catch (error) {
            console.error('[BudgetView] Error applying prediction:', error);
        }
    };

    // Handle budget gap actions
    const handleIncreaseBudget = async () => {
        if (!prediction) return;
        await updateBudgetSettings(trip.id, { totalCap: prediction.totalCost.amount });
    };

    if (loading) {
        return <div className="p-8 text-center">Loading budget data...</div>;
    }

    if (!settings) {
        return (
            <div className="space-y-6">
                {/* Prediction Display - shown even without budget settings */}
                {showPrediction && (
                    <div className="space-y-4">
                        {predictionError ? (
                            <PredictionError
                                message={predictionError}
                                onRetry={() => setPredictionSettingsOpen(true)}
                                onDismiss={() => {
                                    setShowPrediction(false);
                                    setPredictionError(null);
                                }}
                            />
                        ) : prediction ? (
                            <div className="grid md:grid-cols-2 gap-4">
                                <PredictionCard
                                    prediction={prediction}
                                    destination={trip.destination}
                                    destinations={trip.destinations}
                                    days={tripDays}
                                    participants={lastPredictionSettings.participantCount}
                                    travelStyle={lastPredictionSettings.travelStyle}
                                    onApply={() => {
                                        // Open settings modal with prediction values pre-filled
                                        setSettingsOpen(true);
                                    }}
                                    onCustomize={() => setPredictionSettingsOpen(true)}
                                    onDismiss={() => {
                                        setShowPrediction(false);
                                        setPrediction(null);
                                    }}
                                />
                                <CategoryBreakdown
                                    categories={prediction.categoryBreakdown}
                                    currency={prediction.totalCost.currency}
                                    localCurrency={prediction.totalCost.localCurrency}
                                    savingTips={prediction.savingTips}
                                />
                            </div>
                        ) : null}
                    </div>
                )}

                {/* No Budget Set Up prompt */}
                {!showPrediction && (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4 border rounded-lg bg-muted/10">
                        <Wallet className="w-12 h-12 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">No Budget Set Up</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                            Start tracking your trip expenses by setting up a budget.
                        </p>
                        <div className="flex gap-3">
                            <Button onClick={() => setSettingsOpen(true)}>Setup Budget</Button>
                            <Button
                                variant="outline"
                                onClick={() => setPredictionSettingsOpen(true)}
                                disabled={predictionLoading}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                {predictionLoading ? 'Generating...' : 'Get AI Estimate'}
                            </Button>
                        </div>
                    </div>
                )}

                <BudgetSettingsModal
                    tripId={trip.id}
                    currentSettings={null}
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                />
                <PredictionSettingsModal
                    open={predictionSettingsOpen}
                    onOpenChange={setPredictionSettingsOpen}
                    onGenerate={handleGeneratePrediction}
                    isLoading={predictionLoading}
                    defaultParticipants={allParticipants.length || 1}
                />
            </div>
        );
    }

    // Use fetched participants for balances
    const balances = calculateBalances(expenses, settlements, allParticipants.map(p => p.id));

    console.log('[BudgetView] Rendering with showPrediction:', showPrediction, 'prediction:', prediction ? 'exists' : 'null');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Wallet & Wander</h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPredictionSettingsOpen(true)}
                        disabled={predictionLoading}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {predictionLoading ? 'Generating...' : 'AI Predictions'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>

            {/* Prediction Display */}
            {showPrediction && (
                <div className="space-y-4">
                    {predictionError ? (
                        <PredictionError
                            message={predictionError}
                            onRetry={() => setPredictionSettingsOpen(true)}
                            onDismiss={() => {
                                setShowPrediction(false);
                                setPredictionError(null);
                            }}
                        />
                    ) : prediction ? (
                        <>
                            <div className="grid md:grid-cols-2 gap-4">
                                <PredictionCard
                                    prediction={prediction}
                                    destination={trip.destination}
                                    destinations={trip.destinations}
                                    days={tripDays}
                                    participants={lastPredictionSettings.participantCount}
                                    travelStyle={lastPredictionSettings.travelStyle}
                                    onApply={handleApplyPrediction}
                                    onCustomize={() => setPredictionSettingsOpen(true)}
                                    onDismiss={() => {
                                        setShowPrediction(false);
                                        setPrediction(null);
                                    }}
                                />
                                <CategoryBreakdown
                                    categories={prediction.categoryBreakdown}
                                    currency={prediction.totalCost.currency}
                                    localCurrency={prediction.totalCost.localCurrency}
                                    savingTips={prediction.savingTips}
                                />
                            </div>

                            {/* Budget Gap Alert */}
                            {prediction.comparison && prediction.comparison.gap > 0 && (
                                <BudgetGapAlert
                                    userBudget={prediction.comparison.userBudget}
                                    predictedCost={prediction.totalCost.amount}
                                    currency={prediction.totalCost.currency}
                                    recommendation={prediction.comparison.recommendation}
                                    onIncreaseBudget={handleIncreaseBudget}
                                    onAdjustStyle={() => setPredictionSettingsOpen(true)}
                                    onKeepCurrent={() => setShowPrediction(false)}
                                />
                            )}

                            {/* P1: Actuals vs Predicted Tracking */}
                            {expenses.length > 0 && (
                                <ActualsVsPredictedCard
                                    comparison={calculateActualsComparison(
                                        prediction.categoryBreakdown,
                                        expenses,
                                        trip.startDate,
                                        trip.endDate
                                    )}
                                    currency={prediction.totalCost.currency}
                                />
                            )}
                        </>
                    ) : null}
                </div>
            )}

            <BudgetOverview
                settings={settings}
                expenses={expenses}
                currency={settings.baseCurrency}
            />

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Recent Expenses</CardTitle>
                            <Button size="sm" onClick={() => setAddExpenseOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Expense
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ExpenseList
                                expenses={expenses}
                                settlements={settlements}
                                currency={settings.baseCurrency}
                                participants={allParticipants}
                                activities={activities}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Balances</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BalancesView
                                balances={balances}
                                participants={allParticipants}
                                currentUserId={userId}
                                currency={settings.baseCurrency}
                                tripId={trip.id}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <BudgetSettingsModal
                tripId={trip.id}
                currentSettings={settings}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />

            <AddExpenseModal
                tripId={trip.id}
                participants={allParticipants}
                settings={settings}
                open={addExpenseOpen}
                onOpenChange={setAddExpenseOpen}
                currentUserId={userId}
                activities={activities}
            />

            <PredictionSettingsModal
                open={predictionSettingsOpen}
                onOpenChange={setPredictionSettingsOpen}
                onGenerate={handleGeneratePrediction}
                isLoading={predictionLoading}
                defaultParticipants={allParticipants.length || 1}
                defaultStyle={settings.travelStyle || 'midrange'}
            />
        </div>
    );
}
