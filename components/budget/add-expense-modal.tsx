"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TripBudgetSettings, Activity } from "@/types";
import { addExpense } from "@/lib/budget-service";
import { Timestamp } from "firebase/firestore";

interface AddExpenseModalProps {
    tripId: string;
    participants: { id: string; name: string }[];
    settings: TripBudgetSettings;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
    activities?: Activity[];
}

export function AddExpenseModal({ tripId, participants, settings, open, onOpenChange, currentUserId, activities = [] }: AddExpenseModalProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState(settings.baseCurrency);
    const [exchangeRate, setExchangeRate] = useState("1");
    const [category, setCategory] = useState("food");
    const [payer, setPayer] = useState(currentUserId);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [linkedActivityId, setLinkedActivityId] = useState<string>("none");

    // Split State
    const [splitMethod, setSplitMethod] = useState<'equal' | 'exact' | 'percentage' | 'shares'>('equal');
    const [involvedUsers, setInvolvedUsers] = useState<string[]>([]);
    const [splitDetails, setSplitDetails] = useState<Record<string, number>>({});

    const [loading, setLoading] = useState(false);

    // Initialize involved users when modal opens or participants change
    useEffect(() => {
        if (open) {
            setInvolvedUsers(participants.map(p => p.id));
            setSplitDetails({});
            setCurrency(settings.baseCurrency);
            setExchangeRate("1");
            setReceiptFile(null);
            setLinkedActivityId("none");
        }
    }, [open, participants, settings.baseCurrency]);

    const handleActivityChange = (activityId: string) => {
        setLinkedActivityId(activityId);
        if (activityId !== "none") {
            const activity = activities.find(a => a.id === activityId);
            if (activity) {
                setDescription(activity.description);
                setCategory("activities"); // Auto-select activities category
            }
        }
    };

    const handleSave = async () => {
        if (!amount || !description) return;

        setLoading(true);
        try {
            let receiptUrl: string | null = null;
            if (receiptFile) {
                // TODO: Implement actual file upload to Firebase Storage
                console.log("File upload skipped for now (requires storage rules setup)");
            }

            const numAmount = parseFloat(amount);
            const rate = parseFloat(exchangeRate) || 1;
            const baseAmount = numAmount / rate;

            await addExpense(tripId, {
                tripId,
                description,
                amount: baseAmount, // Converted to base currency
                originalAmount: numAmount,
                currency: currency,
                exchangeRate: rate,
                date: Timestamp.now(),
                category,
                payerId: payer,
                splitMethod,
                splitDetails,
                involvedUsers,
                createdBy: currentUserId,
                ...(receiptUrl ? { receiptUrl } : {}),
                ...(linkedActivityId !== "none" ? { linkedActivityId } : {})
            });

            // Reset form
            setDescription("");
            setAmount("");
            setCategory("food");
            setSplitMethod('equal');
            onOpenChange(false);
        } catch (error) {
            console.error("Error adding expense:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserInvolvement = (userId: string) => {
        setInvolvedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleSplitChange = (userId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setSplitDetails(prev => ({
            ...prev,
            [userId]: numValue
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Link to Activity (Optional)</Label>
                        <Select value={linkedActivityId} onValueChange={handleActivityChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an activity..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {activities.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        Day {a.day}: {a.description}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Dinner at Mario's"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <div className="flex gap-2">
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={settings.baseCurrency}>{settings.baseCurrency}</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                        <SelectItem value="JPY">JPY</SelectItem>
                                        <SelectItem value="INR">INR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {currency !== settings.baseCurrency && (
                        <div className="space-y-2 bg-muted/30 p-2 rounded text-sm">
                            <Label>Exchange Rate</Label>
                            <div className="flex items-center gap-2">
                                <span>1 {settings.baseCurrency} = </span>
                                <Input
                                    type="number"
                                    className="w-24 h-8"
                                    value={exchangeRate}
                                    onChange={(e) => setExchangeRate(e.target.value)}
                                />
                                <span>{currency}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {settings.categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Paid By</Label>
                            <Select value={payer} onValueChange={setPayer}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {participants.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.id === currentUserId ? "Me" : p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Receipt (Optional)</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        />
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <Label>Split Method</Label>
                            <Select value={splitMethod} onValueChange={(v: any) => setSplitMethod(v)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="equal">Equally</SelectItem>
                                    <SelectItem value="exact">Exact Amount</SelectItem>
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                    <SelectItem value="shares">Shares</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground mb-2 block">
                                {splitMethod === 'equal' ? "Select who is included" : "Enter split details"}
                            </Label>
                            <ScrollArea className="h-[150px] border rounded-md p-2">
                                <div className="space-y-2">
                                    {participants.map(p => (
                                        <div key={p.id} className="flex items-center justify-between py-1">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={involvedUsers.includes(p.id)}
                                                    onCheckedChange={(checked: boolean) => toggleUserInvolvement(p.id)}
                                                    id={`user-${p.id}`}
                                                />
                                                <label htmlFor={`user-${p.id}`} className="text-sm cursor-pointer">
                                                    {p.id === currentUserId ? "Me" : p.name}
                                                </label>
                                            </div>

                                            {involvedUsers.includes(p.id) && splitMethod !== 'equal' && (
                                                <div className="w-20">
                                                    <Input
                                                        type="number"
                                                        className="h-7 text-xs"
                                                        placeholder={splitMethod === 'percentage' ? "%" : splitMethod === 'shares' ? "1" : "0.00"}
                                                        value={splitDetails[p.id] || ''}
                                                        onChange={(e) => handleSplitChange(p.id, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Adding..." : "Add Expense"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
