"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addSettlement } from "@/lib/budget-service";
import { Timestamp } from "firebase/firestore";

interface SettleUpModalProps {
    tripId: string;
    participants: { id: string; name: string }[];
    currentUserId: string;
    currency: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    prefilledToUser?: string;
    prefilledAmount?: number;
}

export function SettleUpModal({
    tripId,
    participants,
    currentUserId,
    currency,
    open,
    onOpenChange,
    prefilledToUser,
    prefilledAmount
}: SettleUpModalProps) {
    const [toUser, setToUser] = useState(prefilledToUser || "");
    const [amount, setAmount] = useState(prefilledAmount?.toString() || "");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (prefilledToUser) setToUser(prefilledToUser);
            if (prefilledAmount) setAmount(prefilledAmount.toString());
            setPaymentMethod("cash");
            setNote("");
        }
    }, [open, prefilledToUser, prefilledAmount]);

    const handleSave = async () => {
        if (!amount || !toUser) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        setLoading(true);
        try {
            await addSettlement(tripId, {
                tripId,
                fromUserId: currentUserId,
                toUserId: toUser,
                amount: numAmount,
                currency: currency,
                date: Timestamp.now(),
                paymentMethod,
                note
            });

            // Reset form
            setAmount("");
            setToUser("");
            setNote("");
            onOpenChange(false);
        } catch (error) {
            console.error("Error recording settlement:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settle Up</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Paying To</Label>
                        <Select value={toUser} onValueChange={setToUser}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select person" />
                            </SelectTrigger>
                            <SelectContent>
                                {participants
                                    .filter(p => p.id !== currentUserId)
                                    .map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Amount ({currency})</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="venmo">Venmo</SelectItem>
                                <SelectItem value="paypal">PayPal</SelectItem>
                                <SelectItem value="revolut">Revolut</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Note (Optional)</Label>
                        <Input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. Lunch money"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading || !toUser || !amount}>
                        {loading ? "Recording..." : "Record Payment"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
