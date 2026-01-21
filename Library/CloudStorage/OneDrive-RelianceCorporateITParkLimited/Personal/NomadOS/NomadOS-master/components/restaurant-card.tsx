"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Plus, Navigation } from "lucide-react";

interface Restaurant {
    placeId: string;
    name: string;
    rating?: number;
    userRatingsTotal?: number;
    priceLevel?: number;
    vicinity?: string;
    photoUrl?: string;
    reason: string;
    lat: number;
    lng: number;
}

interface RestaurantCardProps {
    restaurant: Restaurant;
    onAddToItinerary: (restaurant: Restaurant) => void;
}

export function RestaurantCard({
    restaurant,
    onAddToItinerary,
}: RestaurantCardProps) {
    const priceString = restaurant.priceLevel
        ? "$".repeat(restaurant.priceLevel + 1)
        : "";

    const handleGetDirections = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;
        window.open(url, "_blank");
    };

    return (
        <Card className="overflow-hidden bg-gradient-to-br from-card to-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <div className="relative h-48 bg-muted">
                {restaurant.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={restaurant.photoUrl}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-red-500/20">
                        <MapPin className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                )}
                {priceString && (
                    <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm font-medium">
                        {priceString}
                    </span>
                )}
            </div>
            <CardContent className="p-4 space-y-3">
                <div>
                    <h3 className="font-semibold text-lg leading-tight line-clamp-1">
                        {restaurant.name}
                    </h3>
                    {restaurant.vicinity && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {restaurant.vicinity}
                        </p>
                    )}
                </div>

                {restaurant.rating && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-medium">{restaurant.rating.toFixed(1)}</span>
                        </div>
                        {restaurant.userRatingsTotal && (
                            <span className="text-sm text-muted-foreground">
                                ({restaurant.userRatingsTotal.toLocaleString()} reviews)
                            </span>
                        )}
                    </div>
                )}

                <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-1">
                        Why you'll love it
                    </p>
                    <p className="text-sm text-foreground/80">{restaurant.reason}</p>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        onClick={() => onAddToItinerary(restaurant)}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Itinerary
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleGetDirections}>
                        <Navigation className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
