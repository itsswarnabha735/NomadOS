import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Simple in-memory cache
const cache = new Map<string, any>();

export async function POST(request: Request) {
    if (!GOOGLE_MAPS_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { origins, destinations, mode = 'driving' } = body;

        if (!origins || !destinations) {
            return NextResponse.json({ error: 'Origins and destinations are required' }, { status: 400 });
        }

        // Construct the API URL
        // Google Maps Distance Matrix API expects pipe-separated lat,lng coordinates
        const formatLocations = (locs: { lat: number; lng: number }[]) =>
            locs.map(l => `${l.lat},${l.lng}`).join('|');

        const originsStr = formatLocations(origins);
        const destinationsStr = formatLocations(destinations);

        // Check cache
        const cacheKey = `${originsStr}-${destinationsStr}-${mode}`;
        if (cache.has(cacheKey)) {
            console.log('Serving from cache:', cacheKey);
            return NextResponse.json(cache.get(cacheKey));
        }

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Google Maps API Error:', data);
            return NextResponse.json({ error: 'Failed to fetch distance matrix', details: data }, { status: 500 });
        }

        // Store in cache
        cache.set(cacheKey, data);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in distance-matrix route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
