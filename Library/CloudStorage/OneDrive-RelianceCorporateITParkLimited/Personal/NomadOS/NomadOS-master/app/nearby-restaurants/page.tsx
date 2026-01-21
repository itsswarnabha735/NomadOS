"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Utensils, MapPin } from "lucide-react";
import Link from "next/link";
import { RestaurantCard } from "@/components/restaurant-card";
import { GoogleMapsWrapper } from "@/components/google-maps-wrapper";

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

function NearbyRestaurantsContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const tripId = searchParams.get("tripId") || "";
    const parentId = searchParams.get("parentId") || "";
    const day = parseInt(searchParams.get("day") || "1", 10);
    const ownerId = searchParams.get("ownerId") || user?.uid || "";
    const preferences = searchParams.get("preferences") || "";

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addingId, setAddingId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (lat === 0 && lng === 0) {
                setError("Location not provided. Please go back and try again.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await fetch("/api/restaurants/recommend", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat, lng, preferences }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch recommendations");
                }

                setRestaurants(data.recommendations || []);
            } catch (err) {
                console.error("Error fetching recommendations:", err);
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        if (user && lat !== 0 && lng !== 0) {
            fetchRecommendations();
        }
    }, [user, lat, lng, preferences]);

    const handleAddToItinerary = async (restaurant: Restaurant) => {
        if (!user || !tripId) {
            alert("Missing trip context. Please go back and try again.");
            return;
        }

        setAddingId(restaurant.placeId);

        try {
            await addDoc(
                collection(db, "users", ownerId, "trips", tripId, "itinerary"),
                {
                    description: restaurant.name,
                    location: {
                        lat: restaurant.lat,
                        lng: restaurant.lng,
                        name: restaurant.name,
                    },
                    day: day,
                    order: Date.now(), // High order to place at end; will be re-ordered on optimize
                    type: "poi",
                    parentId: parentId || undefined,
                    createdAt: Timestamp.now(),
                }
            );

            // Redirect back to trip page
            const backUrl = ownerId !== user.uid
                ? `/trip/${tripId}?ownerId=${ownerId}`
                : `/trip/${tripId}`;
            router.push(backUrl);
        } catch (err) {
            console.error("Error adding to itinerary:", err);
            alert("Failed to add restaurant. Please try again.");
        } finally {
            setAddingId(null);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="px-4 h-16 flex items-center border-b sticky top-0 bg-background/95 backdrop-blur z-10">
                <Link href={tripId ? `/trip/${tripId}${ownerId !== user.uid ? `?ownerId=${ownerId}` : ""}` : "/dashboard"}>
                    <Button variant="ghost" size="icon" className="mr-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20">
                        <Utensils className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight">Dining Suggestions</h1>
                        <p className="text-xs text-muted-foreground">AI-powered recommendations</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 container mx-auto max-w-4xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                        <p className="text-muted-foreground">Finding the best restaurants for you...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <MapPin className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-lg font-medium text-destructive">{error}</p>
                        <Button variant="outline" onClick={() => router.back()}>
                            Go Back
                        </Button>
                    </div>
                ) : restaurants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <Utensils className="w-12 h-12 text-muted-foreground/50" />
                        <p className="text-lg font-medium">No restaurants found nearby</p>
                        <p className="text-sm text-muted-foreground">Try a different location or expand your search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {restaurants.map((restaurant) => (
                            <RestaurantCard
                                key={restaurant.placeId}
                                restaurant={restaurant}
                                onAddToItinerary={handleAddToItinerary}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function NearbyRestaurantsPage() {
    return (
        <GoogleMapsWrapper>
            <Suspense
                fallback={
                    <div className="min-h-screen flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <NearbyRestaurantsContent />
            </Suspense>
        </GoogleMapsWrapper>
    );
}
