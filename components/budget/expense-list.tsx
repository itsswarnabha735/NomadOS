"use client";

import { Expense, Settlement, Activity } from "@/types";
import { format } from "date-fns";
import { Receipt, Coffee, Utensils, Plane, Hotel, Ticket, ShoppingBag, Car, ArrowRightLeft, MapPin } from "lucide-react";

interface ExpenseListProps {
    expenses: Expense[];
    settlements?: Settlement[];
    currency: string;
    participants?: { id: string; name: string }[];
    activities?: Activity[];
}

const getCategoryIcon = (categoryId: string) => {
    // Simple mapping for now
    switch (categoryId.toLowerCase()) {
        case 'food': return <Utensils className="h-4 w-4" />;
        case 'transport': return <Car className="h-4 w-4" />;
        case 'flights': return <Plane className="h-4 w-4" />;
        case 'accommodation': return <Hotel className="h-4 w-4" />;
        case 'activities': return <Ticket className="h-4 w-4" />;
        case 'shopping': return <ShoppingBag className="h-4 w-4" />;
        default: return <Receipt className="h-4 w-4" />;
    }
};

export function ExpenseList({ expenses, settlements = [], currency, participants = [], activities = [] }: ExpenseListProps) {
    const getName = (id: string) => {
        const p = participants.find(p => p.id === id);
        return p ? p.name : id;
    };

    const getActivityName = (id: string) => {
        return activities?.find(a => a.id === id)?.description || "Linked Activity";
    };

    // Combine and sort by date descending
    const items = [
        ...expenses.map(e => ({ ...e, type: 'expense' as const })),
        ...settlements.map(s => ({ ...s, type: 'settlement' as const }))
    ].sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return dateB - dateA;
    });

    if (items.length === 0) {
        return <div className="text-center text-muted-foreground py-8">No transactions recorded yet.</div>;
    }

    return (
        <div className="space-y-4">
            {items.map((item) => {
                if (item.type === 'settlement') {
                    return (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-100 text-green-600 rounded-full">
                                    <ArrowRightLeft className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {getName(item.fromUserId)} paid {getName(item.toUserId)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.date?.seconds ? format(new Date(item.date.seconds * 1000), "MMM d, h:mm a") : "Just now"}
                                        {item.note && ` • ${item.note}`}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-green-600">
                                    {item.currency} {item.amount.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {item.paymentMethod?.replace('_', ' ') || 'Payment'}
                                </p>
                            </div>
                        </div>
                    );
                } else {
                    return (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-full text-primary">
                                    {getCategoryIcon(item.category)}
                                </div>
                                <div>
                                    <p className="font-medium">{item.description}</p>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <span>{item.date?.seconds ? format(new Date(item.date.seconds * 1000), "MMM d, h:mm a") : "Just now"}</span>
                                        <span>•</span>
                                        <span>{item.payerId ? "Paid by " + getName(item.payerId) : "Paid"}</span>
                                        {item.linkedActivityId && (
                                            <>
                                                <span>•</span>
                                                <span className="text-primary flex items-center gap-0.5">
                                                    <MapPin className="w-3 h-3" />
                                                    {getActivityName(item.linkedActivityId)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">
                                    {currency} {item.amount.toFixed(2)}
                                </p>
                                {item.currency !== currency && (
                                    <p className="text-xs text-muted-foreground">
                                        ({item.currency} {item.originalAmount.toFixed(2)})
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                }
            })}
        </div>
    );
}
