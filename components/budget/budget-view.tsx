import { useEffect, useState, useMemo } from "react";
import { Trip, TripBudgetSettings, Expense, Settlement, Activity } from "@/types";
import { subscribeToBudgetSettings, subscribeToExpenses, subscribeToSettlements, calculateBalances } from "@/lib/budget-service";
import { BudgetOverview } from "./budget-overview";
import { ExpenseList } from "./expense-list";
import { BudgetSettingsModal } from "./budget-settings-modal";
import { AddExpenseModal } from "./add-expense-modal";
import { BalancesView } from "./balances-view";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Wallet } from "lucide-react";
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


    if (loading) {
        return <div className="p-8 text-center">Loading budget data...</div>;
    }

    if (!settings) {
        return (
            <>
                <div className="flex flex-col items-center justify-center p-12 space-y-4 border rounded-lg bg-muted/10">
                    <Wallet className="w-12 h-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No Budget Set Up</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                        Start tracking your trip expenses by setting up a budget.
                    </p>
                    <Button onClick={() => setSettingsOpen(true)}>Setup Budget</Button>
                </div>
                <BudgetSettingsModal
                    tripId={trip.id}
                    currentSettings={null}
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                />
            </>
        );
    }

    // Use fetched participants for balances
    const balances = calculateBalances(expenses, settlements, allParticipants.map(p => p.id));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Wallet & Wander</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                    <Button size="sm" onClick={() => setAddExpenseOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                    </Button>
                </div>
            </div>

            <BudgetOverview
                settings={settings}
                expenses={expenses}
                currency={settings.baseCurrency}
            />

            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Expenses</CardTitle>
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
        </div>
    );
}
