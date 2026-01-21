"use client";

import { useState } from "react";
import {
    TravelStyle,
    AccommodationStyle,
    DiningStyle,
    ActivityPreference
} from "@/types/budget-prediction";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Plane, Car, Hotel, Utensils, Ticket } from "lucide-react";

export type FlightClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type TransportPreference = 'public' | 'cabs' | 'rental' | 'mixed';

interface PredictionSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (settings: {
        // Core params
        participantCount: number;
        origin?: string;
        // Granular preferences
        flightClass: FlightClass;
        transportPreference: TransportPreference;
        accommodationStyle: AccommodationStyle;
        diningStyle: DiningStyle;
        activityPreference: ActivityPreference;
        // Legacy support (optional or derived)
        travelStyle: TravelStyle;
    }) => void;
    isLoading: boolean;
    defaultParticipants?: number;
    defaultStyle?: TravelStyle;
}

export function PredictionSettingsModal({
    open,
    onOpenChange,
    onGenerate,
    isLoading,
    defaultParticipants = 1,
    defaultStyle = 'midrange',
}: PredictionSettingsModalProps) {
    const [travelStyle, setTravelStyle] = useState<TravelStyle>(defaultStyle);
    const [participantCount, setParticipantCount] = useState(defaultParticipants);
    const [flightClass, setFlightClass] = useState<FlightClass>('economy');
    const [transportPreference, setTransportPreference] = useState<TransportPreference>('mixed');
    const [accommodationStyle, setAccommodationStyle] = useState<AccommodationStyle>('standard_hotel');
    const [diningStyle, setDiningStyle] = useState<DiningStyle>('casual_dining');
    const [activityPreference, setActivityPreference] = useState<ActivityPreference>('standard_mixed');
    const [origin, setOrigin] = useState('');

    const applyPreset = (style: TravelStyle) => {
        setTravelStyle(style);
        if (style === 'budget') {
            setAccommodationStyle('hostel_budget');
            setDiningStyle('street_budget');
            setActivityPreference('low_cost');
            setFlightClass('economy');
            setTransportPreference('public');
        } else if (style === 'midrange') {
            setAccommodationStyle('standard_hotel');
            setDiningStyle('casual_dining');
            setActivityPreference('standard_mixed');
            setFlightClass('economy');
            setTransportPreference('mixed');
        } else if (style === 'premium') {
            setAccommodationStyle('luxury_hotel');
            setDiningStyle('fine_dining');
            setActivityPreference('premium_tours');
            setFlightClass('business');
            setTransportPreference('cabs');
        }
    };

    const handleGenerate = () => {
        onGenerate({
            travelStyle,
            participantCount,
            flightClass,
            transportPreference,
            accommodationStyle,
            diningStyle,
            activityPreference,
            origin: origin.trim() || undefined,
        });
    };

    const styleOptions: { value: TravelStyle; label: string; description: string; icon: string }[] = [
        {
            value: 'budget',
            label: 'Budget Preset',
            description: 'Apply budget defaults',
            icon: '💸',
        },
        {
            value: 'midrange',
            label: 'Mid-Range',
            description: '3-4★ hotels, restaurants, mixed transport',
            icon: '💰',
        },
        {
            value: 'premium',
            label: 'Premium',
            description: '5★ hotels, fine dining, private transport',
            icon: '💎',
        },
    ];

    const flightOptions: { value: FlightClass; label: string; icon: string }[] = [
        { value: 'economy', label: 'Economy', icon: '💺' },
        { value: 'premium_economy', label: 'Premium Economy', icon: '🌟' },
        { value: 'business', label: 'Business', icon: '💼' },
        { value: 'first', label: 'First Class', icon: '👑' },
    ];

    const transportOptions: { value: TransportPreference; label: string; description: string; icon: string }[] = [
        { value: 'public', label: 'Public', description: 'Metro, bus, trains', icon: '🚇' },
        { value: 'cabs', label: 'Cabs/Taxi', description: 'Uber, Ola, taxis', icon: '🚕' },
        { value: 'rental', label: 'Rental Car', description: 'Self-drive rental', icon: '🚗' },
        { value: 'mixed', label: 'Mixed', description: 'Best of all options', icon: '🔄' },
    ];

    const accommodationOptions: { value: AccommodationStyle; label: string; icon: string }[] = [
        { value: 'hostel_budget', label: 'Hostel/Budget', icon: '⛺' },
        { value: 'standard_hotel', label: 'Standard Hotel', icon: '🏨' },
        { value: 'luxury_hotel', label: 'Luxury Hotel', icon: '🏰' },
    ];

    const diningOptions: { value: DiningStyle; label: string; icon: string }[] = [
        { value: 'street_budget', label: 'Street Food', icon: '🌭' },
        { value: 'casual_dining', label: 'Casual Dining', icon: '🍽️' },
        { value: 'fine_dining', label: 'Fine Dining', icon: '🍷' },
    ];

    const activityOptions: { value: ActivityPreference; label: string; icon: string }[] = [
        { value: 'low_cost', label: 'Free/Low Cost', icon: '🎫' },
        { value: 'standard_mixed', label: 'Standard Mix', icon: '🎟️' },
        { value: 'premium_tours', label: 'Premium Tours', icon: '🚁' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Prediction Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure your travel preferences to get an accurate AI-powered budget prediction.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Quick Presets */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Quick Presets</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {styleOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => applyPreset(option.value)}
                                    className={`
                                        flex flex-col items-center p-2 rounded-lg border-2 transition-all
                                        ${travelStyle === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/50'
                                        }
                                    `}
                                >
                                    <span className="text-xl mb-1">{option.icon}</span>
                                    <span className="font-medium text-xs">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Flight Class Selection */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Plane className="h-4 w-4" />
                            Flight Class
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            {flightOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setFlightClass(option.value)}
                                    className={`
                                        flex flex-col items-center p-2 rounded-lg border-2 transition-all
                                        ${flightClass === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/50'
                                        }
                                    `}
                                >
                                    <span className="text-lg">{option.icon}</span>
                                    <span className="font-medium text-xs text-center">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Accommodation Style */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Hotel className="h-4 w-4" />
                            Accommodation
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {accommodationOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setAccommodationStyle(option.value)}
                                    className={`
                                            flex flex-col items-center p-2 rounded-lg border-2 transition-all
                                            ${accommodationStyle === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/50'
                                        }
                                        `}
                                >
                                    <span className="text-lg">{option.icon}</span>
                                    <span className="font-medium text-xs text-center">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dining Style */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Utensils className="h-4 w-4" />
                            Dining
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {diningOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setDiningStyle(option.value)}
                                    className={`
                                            flex flex-col items-center p-2 rounded-lg border-2 transition-all
                                            ${diningStyle === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/50'
                                        }
                                        `}
                                >
                                    <span className="text-lg">{option.icon}</span>
                                    <span className="font-medium text-xs text-center">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Origin City */}
                    <div className="space-y-2">
                        <Label htmlFor="origin">From (Origin City) <span className="text-xs font-normal text-muted-foreground">(Optional)</span></Label>
                        <Input
                            id="origin"
                            placeholder="e.g. New York, London, Mumbai"
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Leave blank to estimate based on typical routes.
                        </p>
                    </div>

                    {/* Transport Preference Selection */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            Local Transport
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            {transportOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setTransportPreference(option.value)}
                                    className={`
                                        flex flex-col items-center p-2 rounded-lg border-2 transition-all
                                        ${transportPreference === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/50'
                                        }
                                    `}
                                >
                                    <span className="text-lg">{option.icon}</span>
                                    <span className="font-medium text-xs">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Activity Preference */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Ticket className="h-4 w-4" />
                            Activities
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {activityOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setActivityPreference(option.value)}
                                    className={`
                                            flex flex-col items-center p-2 rounded-lg border-2 transition-all
                                            ${activityPreference === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted hover:border-muted-foreground/50'
                                        }
                                        `}
                                >
                                    <span className="text-lg">{option.icon}</span>
                                    <span className="font-medium text-xs text-center">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Participant Count */}
                    <div className="space-y-2">
                        <Label htmlFor="participants">Number of Travelers</Label>
                        <Input
                            id="participants"
                            type="number"
                            min={1}
                            max={20}
                            value={participantCount}
                            onChange={(e) => setParticipantCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24"
                        />
                        <p className="text-xs text-muted-foreground">
                            Cost predictions will be calculated for all travelers combined.
                        </p>
                    </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Prediction
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
