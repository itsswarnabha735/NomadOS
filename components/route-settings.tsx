"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlacesAutocomplete } from "@/components/places-autocomplete";
import { MapPin, Car, PersonStanding, Bus, RotateCcw, Settings2 } from "lucide-react";
interface RouteSettingsProps {
    locations: { id: string; name: string }[];
    onOptimize: (settings: RouteConfig) => void;
    onAIOptimize?: (settings: RouteConfig) => void;
    isOptimizing: boolean;
}

export interface RouteConfig {
    startPoint: {
        type: 'first_location' | 'custom' | 'specific_location';
        locationId?: string;
        customLocation?: { lat: number; lng: number; name: string };
    };
    endPoint: {
        type: 'last_location' | 'return_to_start' | 'custom' | 'specific_location';
        locationId?: string;
        customLocation?: { lat: number; lng: number; name: string };
    };
    travelMode: 'driving' | 'walking' | 'transit' | 'bicycling';
}

export function RouteSettings({ locations, onOptimize, onAIOptimize, isOptimizing }: RouteSettingsProps) {
    const [config, setConfig] = useState<RouteConfig>({
        startPoint: { type: 'first_location' },
        endPoint: { type: 'last_location' },
        travelMode: 'driving'
    });

    const [customStartPlace, setCustomStartPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const [customEndPlace, setCustomEndPlace] = useState<google.maps.places.PlaceResult | null>(null);

    // Update config when custom places change
    useEffect(() => {
        if (customStartPlace && customStartPlace.geometry?.location) {
            setConfig(prev => ({
                ...prev,
                startPoint: {
                    type: 'custom',
                    customLocation: {
                        lat: customStartPlace.geometry!.location!.lat(),
                        lng: customStartPlace.geometry!.location!.lng(),
                        name: customStartPlace.name || customStartPlace.formatted_address || "Custom Start"
                    }
                }
            }));
        }
    }, [customStartPlace]);

    useEffect(() => {
        if (customEndPlace && customEndPlace.geometry?.location) {
            setConfig(prev => ({
                ...prev,
                endPoint: {
                    type: 'custom',
                    customLocation: {
                        lat: customEndPlace.geometry!.location!.lat(),
                        lng: customEndPlace.geometry!.location!.lng(),
                        name: customEndPlace.name || customEndPlace.formatted_address || "Custom End"
                    }
                }
            }));
        }
    }, [customEndPlace]);

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Route Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Travel Mode */}
                <div className="space-y-2">
                    <Label>Travel Mode</Label>
                    <div className="flex gap-2">
                        <Button
                            variant={config.travelMode === 'driving' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setConfig({ ...config, travelMode: 'driving' })}
                            className="flex-1"
                        >
                            <Car className="h-4 w-4 mr-2" /> Drive
                        </Button>
                        <Button
                            variant={config.travelMode === 'walking' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setConfig({ ...config, travelMode: 'walking' })}
                            className="flex-1"
                        >
                            <PersonStanding className="h-4 w-4 mr-2" /> Walk
                        </Button>
                        <Button
                            variant={config.travelMode === 'transit' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setConfig({ ...config, travelMode: 'transit' })}
                            className="flex-1"
                        >
                            <Bus className="h-4 w-4 mr-2" /> Transit
                        </Button>
                    </div>
                </div>

                {/* Start Point */}
                <div className="space-y-2">
                    <Label>Start Point</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={config.startPoint.type === 'specific_location' ? config.startPoint.locationId : config.startPoint.type}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'first_location' || val === 'custom') {
                                setConfig({ ...config, startPoint: { type: val } });
                            } else {
                                setConfig({ ...config, startPoint: { type: 'specific_location', locationId: val } });
                            }
                        }}
                    >
                        <option value="first_location">First Activity in List</option>
                        <option value="custom">Custom Location...</option>
                        <optgroup label="Specific Place">
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </optgroup>
                    </select>

                    {config.startPoint.type === 'custom' && (
                        <PlacesAutocomplete onPlaceSelect={setCustomStartPlace} />
                    )}
                </div>

                {/* End Point */}
                <div className="space-y-2">
                    <Label>End Point</Label>
                    <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={config.endPoint.type === 'specific_location' ? config.endPoint.locationId : config.endPoint.type}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'last_location' || val === 'return_to_start' || val === 'custom') {
                                setConfig({ ...config, endPoint: { type: val } });
                            } else {
                                setConfig({ ...config, endPoint: { type: 'specific_location', locationId: val } });
                            }
                        }}
                    >
                        <option value="last_location">Last Activity in List</option>
                        <option value="return_to_start">Return to Start</option>
                        <option value="custom">Custom Location...</option>
                        <optgroup label="Specific Place">
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </optgroup>
                    </select>

                    {config.endPoint.type === 'custom' && (
                        <PlacesAutocomplete onPlaceSelect={setCustomEndPlace} />
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        className="flex-1"
                        onClick={() => onOptimize(config)}
                        disabled={isOptimizing}
                    >
                        {isOptimizing ? "Optimizing..." : "Optimize Route"}
                    </Button>
                    <Button
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={() => onAIOptimize && onAIOptimize(config)}
                        disabled={isOptimizing}
                    >
                        {isOptimizing ? "Thinking..." : "AI Magic ✨"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
