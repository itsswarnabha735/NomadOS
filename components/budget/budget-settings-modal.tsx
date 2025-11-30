"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TripBudgetSettings, BudgetCategory } from "@/types";
import { createBudgetSettings, updateBudgetSettings } from "@/lib/budget-service";

interface BudgetSettingsModalProps {
    tripId: string;
    currentSettings: TripBudgetSettings | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DEFAULT_CATEGORIES = [
    { id: 'food', name: 'Food & Drink', icon: 'Utensils', isDefault: true },
    { id: 'transport', name: 'Transport', icon: 'Car', isDefault: true },
    { id: 'accommodation', name: 'Accommodation', icon: 'Hotel', isDefault: true },
    { id: 'activities', name: 'Activities', icon: 'Ticket', isDefault: true },
    { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', isDefault: true },
    { id: 'flights', name: 'Flights', icon: 'Plane', isDefault: true },
];

export function BudgetSettingsModal({ tripId, currentSettings, open, onOpenChange }: BudgetSettingsModalProps) {
    const [currency, setCurrency] = useState(currentSettings?.baseCurrency || "USD");
    const [totalCap, setTotalCap] = useState(currentSettings?.totalCap?.toString() || "");
    const [categories, setCategories] = useState<BudgetCategory[]>(currentSettings?.categories || DEFAULT_CATEGORIES);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const settings: TripBudgetSettings = {
                baseCurrency: currency,
                tripType: 'total_cap',
                totalCap: parseFloat(totalCap) || 0,
                bufferPercentage: 0,
                categories: categories,
                dailyAllowance: 0
            };

            if (currentSettings) {
                await updateBudgetSettings(tripId, settings);
            } else {
                await createBudgetSettings(tripId, settings);
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving budget settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryCapChange = (id: string, cap: string) => {
        setCategories(prev => prev.map(c =>
            c.id === id ? { ...c, cap: parseFloat(cap) || 0 } : c
        ));
    };

    const addCustomCategory = () => {
        if (!newCategoryName.trim()) return;
        const newId = newCategoryName.toLowerCase().replace(/\s+/g, '_');
        setCategories(prev => [
            ...prev,
            { id: newId, name: newCategoryName, icon: 'Tag', isDefault: false, cap: 0 }
        ]);
        setNewCategoryName("");
    };

    const removeCategory = (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Budget Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Trip Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Total Budget Cap</Label>
                            <Input
                                type="number"
                                value={totalCap}
                                onChange={(e) => setTotalCap(e.target.value)}
                                placeholder="e.g. 5000"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <Label className="text-base font-semibold">Categories & Caps</Label>
                        <div className="space-y-3">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Label className="text-sm font-medium">{cat.name}</Label>
                                    </div>
                                    <div className="w-24">
                                        <Input
                                            type="number"
                                            placeholder="Cap"
                                            className="h-8 text-sm"
                                            value={cat.cap || ''}
                                            onChange={(e) => handleCategoryCapChange(cat.id, e.target.value)}
                                        />
                                    </div>
                                    {!cat.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive"
                                            onClick={() => removeCategory(cat.id)}
                                        >
                                            &times;
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Input
                                placeholder="New Category Name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="h-9"
                            />
                            <Button onClick={addCustomCategory} size="sm" variant="secondary">Add</Button>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Settings"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
