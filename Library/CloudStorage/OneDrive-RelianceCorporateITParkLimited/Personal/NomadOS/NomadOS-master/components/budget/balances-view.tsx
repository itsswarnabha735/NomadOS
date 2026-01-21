"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SettleUpModal } from "./settle-up-modal";

interface BalancesViewProps {
    balances: Record<string, number>;
    participants: { id: string; name: string }[];
    currentUserId: string;
    currency: string;
    tripId: string;
}

export function BalancesView({ balances, participants, currentUserId, currency, tripId }: BalancesViewProps) {
    const [settleModalOpen, setSettleModalOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<{ toUser: string, amount: number } | null>(null);

    // Helper to get name
    const getName = (id: string) => participants.find(p => p.id === id)?.name || id;

    // Calculate simplified debts
    // This is a naive implementation. For true debt simplification (min-cash-flow), we'd need a more complex algo.
    // For now, we just show who is positive (owed) and who is negative (owes).
    // A better approach for display:
    // 1. Separate into debtors (negative) and creditors (positive).
    // 2. Match them up.

    const debtors = Object.entries(balances)
        .filter(([_, amount]) => amount < -0.01)
        .sort((a, b) => a[1] - b[1]); // Most negative first

    const creditors = Object.entries(balances)
        .filter(([_, amount]) => amount > 0.01)
        .sort((a, b) => b[1] - a[1]); // Most positive first

    const debts: { from: string; to: string; amount: number }[] = [];

    // Copy to avoid mutating original
    const dStack = debtors.map(d => ({ id: d[0], amount: d[1] }));
    const cStack = creditors.map(c => ({ id: c[0], amount: c[1] }));

    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < dStack.length && j < cStack.length) {
        const debtor = dStack[i];
        const creditor = cStack[j];

        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        debts.push({
            from: debtor.id,
            to: creditor.id,
            amount: amount
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    const myDebts = debts.filter(d => d.from === currentUserId);
    const owedToMe = debts.filter(d => d.to === currentUserId);

    const handleSettleClick = (toUser: string, amount: number) => {
        setSelectedDebt({ toUser, amount });
        setSettleModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Net Balances Visualization */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Net Balances</h4>
                <div className="space-y-3">
                    {participants.map(p => {
                        const bal = balances[p.id] || 0;
                        const isPositive = bal > 0;
                        const width = Math.min(Math.abs(bal) / (Math.max(...Object.values(balances).map(Math.abs)) || 1) * 100, 100);

                        return (
                            <div key={p.id} className="flex items-center gap-2 text-sm">
                                <div className="w-20 truncate text-right">{p.id === currentUserId ? "Me" : p.name}</div>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                                    <div className="flex-1 flex justify-end">
                                        {!isPositive && (
                                            <div style={{ width: `${width}%` }} className="h-full bg-red-400 rounded-l-full" />
                                        )}
                                    </div>
                                    <div className="w-px bg-border" />
                                    <div className="flex-1">
                                        {isPositive && (
                                            <div style={{ width: `${width}%` }} className="h-full bg-green-500 rounded-r-full" />
                                        )}
                                    </div>
                                </div>
                                <div className={`w-20 ${isPositive ? "text-green-600" : bal < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                    {bal > 0 ? "+" : ""}{bal.toFixed(2)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Suggested Payments */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Suggested Payments</h4>
                {debts.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">All settled up!</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {debts.map((debt, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-card/50 hover:bg-card transition-colors">
                                <div className="flex items-center gap-2 text-sm flex-1 min-w-0 mr-4">
                                    <span className="font-medium truncate">{debt.from === currentUserId ? "You" : getName(debt.from)}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="font-medium truncate">{debt.to === currentUserId ? "You" : getName(debt.to)}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-bold text-sm whitespace-nowrap">{currency} {debt.amount.toFixed(2)}</span>
                                    {debt.from === currentUserId && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-7 px-3 text-xs"
                                            onClick={() => handleSettleClick(debt.to, debt.amount)}
                                        >
                                            Settle
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <SettleUpModal
                tripId={tripId}
                participants={participants}
                currentUserId={currentUserId}
                currency={currency}
                open={settleModalOpen}
                onOpenChange={(open) => {
                    setSettleModalOpen(open);
                    if (!open) setSelectedDebt(null);
                }}
                prefilledToUser={selectedDebt?.toUser}
                prefilledAmount={selectedDebt?.amount}
            />
        </div>
    );
}
