"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
    Sparkles,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    Loader2,
    CloudRain,
    Thermometer,
    Package,
} from "lucide-react";
import { Trip } from "@/types";
import {
    PackingItem,
    PackingCategory,
    CATEGORY_LABELS,
    CATEGORY_ICONS,
    PackingSuggestion,
} from "@/types/packing";
import { getTripWeatherSummary } from "@/app/actions/get-weather";

interface PackingListProps {
    trip: Trip;
    userId: string;
    ownerId: string;
    canEdit: boolean;
}

export function PackingList({ trip, userId, ownerId, canEdit }: PackingListProps) {
    const [items, setItems] = useState<PackingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [suggestingItems, setSuggestingItems] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemCategory, setNewItemCategory] = useState<PackingCategory>("custom");
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [expandedCategories, setExpandedCategories] = useState<Set<PackingCategory>>(
        new Set(['clothing', 'weather_gear', 'documents'])
    );
    const [weatherSummary, setWeatherSummary] = useState<{
        avgTemp: number;
        rainProbability: number;
        conditions: string[];
        isRealForecast?: boolean;
        tripDatesInfo?: string;
    } | null>(null);

    // Listen to packing items from Firestore
    useEffect(() => {
        const packingRef = collection(db, "users", ownerId, "trips", trip.id, "packingList");
        const unsubscribe = onSnapshot(packingRef, (snapshot) => {
            const packingItems: PackingItem[] = [];
            snapshot.forEach((doc) => {
                packingItems.push({ id: doc.id, ...doc.data() } as PackingItem);
            });
            setItems(packingItems);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [trip.id, ownerId]);

    // Calculate progress
    const totalItems = items.length;
    const packedItems = items.filter((item) => item.isPacked).length;
    const progressPercentage = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

    // Group items by category
    const itemsByCategory = items.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<PackingCategory, PackingItem[]>);

    // Toggle category expansion
    const toggleCategory = (category: PackingCategory) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    // Toggle item packed status
    const toggleItemPacked = async (itemId: string, isPacked: boolean) => {
        if (!canEdit) return;
        try {
            const itemRef = doc(db, "users", ownerId, "trips", trip.id, "packingList", itemId);
            await updateDoc(itemRef, { isPacked: !isPacked });
        } catch (error) {
            console.error("Error updating item:", error);
        }
    };

    // Delete item
    const deleteItem = async (itemId: string) => {
        if (!canEdit) return;
        try {
            const itemRef = doc(db, "users", ownerId, "trips", trip.id, "packingList", itemId);
            await deleteDoc(itemRef);
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    // Add custom item
    const addCustomItem = async () => {
        if (!canEdit || !newItemName.trim()) return;
        try {
            const packingRef = collection(db, "users", ownerId, "trips", trip.id, "packingList");
            await addDoc(packingRef, {
                name: newItemName.trim(),
                category: newItemCategory,
                quantity: newItemQuantity,
                isPacked: false,
                isAISuggested: false,
                createdAt: serverTimestamp(),
            });
            setNewItemName("");
            setNewItemQuantity(1);
            setAddDialogOpen(false);
        } catch (error) {
            console.error("Error adding item:", error);
        }
    };

    // Get AI Suggestions
    const getAISuggestions = async () => {
        if (!canEdit) return;
        setSuggestingItems(true);

        try {
            // Get weather summary for the destination with trip dates
            const destination = trip.destinations?.[0] || trip.destination;
            const weather = await getTripWeatherSummary(destination, trip.startDate, trip.endDate);

            // Prepare existing items to exclude
            const existingItemNames = items.map((item) => item.name.toLowerCase());

            // Call the API
            const response = await fetch("/api/packing-suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    destination,
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                    weatherForecast: weather?.forecasts || [],
                    existingItems: existingItemNames,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get suggestions");
            }

            const data = await response.json();
            const suggestions: PackingSuggestion[] = data.suggestions;
            setWeatherSummary({
                ...data.weatherSummary,
                isRealForecast: weather?.isRealForecast,
                tripDatesInfo: weather?.tripDatesInfo
            });

            // Add suggestions to Firestore in batch
            const batch = writeBatch(db);
            const packingRef = collection(db, "users", ownerId, "trips", trip.id, "packingList");

            suggestions.forEach((suggestion) => {
                // Check if item already exists
                const exists = items.some(
                    (item) => item.name.toLowerCase() === suggestion.name.toLowerCase()
                );
                if (!exists) {
                    const newDocRef = doc(packingRef);
                    batch.set(newDocRef, {
                        name: suggestion.name,
                        category: suggestion.category,
                        quantity: suggestion.quantity,
                        isPacked: false,
                        isAISuggested: true,
                        weatherReason: suggestion.weatherReason || null,
                        createdAt: serverTimestamp(),
                    });
                }
            });

            await batch.commit();

            // Expand all categories that received new items
            const newCategories = new Set(suggestions.map((s) => s.category));
            setExpandedCategories((prev) => new Set([...prev, ...newCategories]));

        } catch (error) {
            console.error("Error getting AI suggestions:", error);
            alert("Failed to get AI suggestions. Please try again.");
        } finally {
            setSuggestingItems(false);
        }
    };

    // Clear all items
    const clearAllItems = async () => {
        if (!canEdit || items.length === 0) return;
        if (!confirm("Are you sure you want to clear all packing items? This cannot be undone.")) {
            return;
        }

        try {
            const batch = writeBatch(db);
            items.forEach((item) => {
                const itemRef = doc(db, "users", ownerId, "trips", trip.id, "packingList", item.id);
                batch.delete(itemRef);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error clearing items:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Card with Progress */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <CardTitle>Packing List</CardTitle>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {packedItems}/{totalItems} items packed
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <Progress value={progressPercentage} className="h-3" />
                        <p className="text-sm text-center text-muted-foreground">
                            {progressPercentage}% complete
                        </p>
                    </div>

                    {/* Weather Summary */}
                    {weatherSummary && (
                        <div className="space-y-2">
                            <div className={`flex items-center justify-center gap-4 p-3 rounded-lg text-sm ${weatherSummary.isRealForecast === false
                                    ? 'bg-amber-50 border border-amber-200'
                                    : 'bg-muted/50'
                                }`}>
                                <div className="flex items-center gap-1">
                                    <Thermometer className="h-4 w-4 text-orange-500" />
                                    <span>Avg {weatherSummary.avgTemp}°C</span>
                                </div>
                                {weatherSummary.rainProbability > 0 && (
                                    <div className="flex items-center gap-1">
                                        <CloudRain className="h-4 w-4 text-blue-500" />
                                        <span>Up to {weatherSummary.rainProbability}% rain</span>
                                    </div>
                                )}
                            </div>
                            {weatherSummary.tripDatesInfo && (
                                <p className={`text-xs text-center ${weatherSummary.isRealForecast === false
                                        ? 'text-amber-600'
                                        : 'text-muted-foreground'
                                    }`}>
                                    {weatherSummary.tripDatesInfo}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={getAISuggestions}
                            disabled={!canEdit || suggestingItems}
                            className="flex-1 sm:flex-none"
                        >
                            {suggestingItems ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Getting Suggestions...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Get AI Suggestions
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setAddDialogOpen(true)}
                            disabled={!canEdit}
                            className="flex-1 sm:flex-none"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                        </Button>
                        {items.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllItems}
                                disabled={!canEdit}
                                className="text-destructive hover:text-destructive"
                            >
                                Clear All
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Empty State */}
            {items.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No packing items yet</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                            Click &quot;Get AI Suggestions&quot; to get smart packing recommendations based on your destination and weather forecast.
                        </p>
                        <Button onClick={getAISuggestions} disabled={!canEdit || suggestingItems}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Get AI Suggestions
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Category Sections */}
            {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
                <Card key={category}>
                    <Collapsible
                        open={expandedCategories.has(category as PackingCategory)}
                        onOpenChange={() => toggleCategory(category as PackingCategory)}
                    >
                        <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {expandedCategories.has(category as PackingCategory) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                        <span className="text-lg">
                                            {CATEGORY_ICONS[category as PackingCategory]}
                                        </span>
                                        <CardTitle className="text-base">
                                            {CATEGORY_LABELS[category as PackingCategory]?.replace(/^.+\s/, '') || category}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {categoryItems.filter((i) => i.isPacked).length}/{categoryItems.length}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    {categoryItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.isPacked
                                                ? "bg-muted/30 border-muted"
                                                : "bg-background hover:bg-muted/20"
                                                }`}
                                        >
                                            <Checkbox
                                                checked={item.isPacked}
                                                onCheckedChange={() => toggleItemPacked(item.id, item.isPacked)}
                                                disabled={!canEdit}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`font-medium ${item.isPacked ? "line-through text-muted-foreground" : ""
                                                            }`}
                                                    >
                                                        {item.name}
                                                    </span>
                                                    {item.quantity > 1 && (
                                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                            x{item.quantity}
                                                        </span>
                                                    )}
                                                    {item.isAISuggested && (
                                                        <Sparkles className="h-3 w-3 text-amber-500" />
                                                    )}
                                                </div>
                                                {item.weatherReason && (
                                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                        <CloudRain className="h-3 w-3 text-blue-500" />
                                                        {item.weatherReason}
                                                    </p>
                                                )}
                                            </div>
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => deleteItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            ))}

            {/* Add Item Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Packing Item</DialogTitle>
                        <DialogDescription>
                            Add a custom item to your packing list.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Item Name</label>
                            <Input
                                placeholder="e.g., Camera, Sunglasses..."
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select
                                    value={newItemCategory}
                                    onValueChange={(v) => setNewItemCategory(v as PackingCategory)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Quantity</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={newItemQuantity}
                                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={addCustomItem} disabled={!newItemName.trim()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
