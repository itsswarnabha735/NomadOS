import { NextRequest, NextResponse } from "next/server";
import {
    getRestaurantRecommendations,
    PlaceCandidate,
} from "@/lib/gemini-restaurant";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface NearbySearchResult {
    place_id: string;
    name: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    vicinity?: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    photos?: { photo_reference: string }[];
    types?: string[];
}

async function fetchNearbyRestaurants(
    lat: number,
    lng: number,
    radius: number = 1500
): Promise<PlaceCandidate[]> {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=restaurant&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("[Places API] Error:", data.status, data.error_message);
        throw new Error(`Places API Error: ${data.status}`);
    }

    const results: NearbySearchResult[] = data.results || [];

    return results.map((r) => ({
        placeId: r.place_id,
        name: r.name,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        priceLevel: r.price_level,
        vicinity: r.vicinity,
        photoUrl: r.photos?.[0]?.photo_reference
            ? `/api/place-photo?photoReference=${r.photos[0].photo_reference}&maxWidth=400`
            : undefined,
        types: r.types,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
    }));
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lat, lng, preferences } = body;

        if (typeof lat !== "number" || typeof lng !== "number") {
            return NextResponse.json(
                { error: "lat and lng are required as numbers" },
                { status: 400 }
            );
        }

        // 1. Fetch candidate restaurants from Google Places API
        const candidates = await fetchNearbyRestaurants(lat, lng);

        if (candidates.length === 0) {
            return NextResponse.json({ recommendations: [] });
        }

        // 2. Use Gemini to rank and add personalized reasons
        const recommendations = await getRestaurantRecommendations(
            candidates,
            preferences
        );

        return NextResponse.json({ recommendations });
    } catch (error) {
        console.error("[API /restaurants/recommend] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
