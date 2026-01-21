"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Simple in-memory cache
const cache = new Map();
async function POST(request) {
    if (!GOOGLE_MAPS_API_KEY) {
        return server_1.NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
    }
    try {
        const body = await request.json();
        const { origins, destinations, mode = 'driving' } = body;
        if (!origins || !destinations) {
            return server_1.NextResponse.json({ error: 'Origins and destinations are required' }, { status: 400 });
        }
        // Construct the API URL
        // Google Maps Distance Matrix API expects pipe-separated lat,lng coordinates
        const formatLocations = (locs) => locs.map(l => `${l.lat},${l.lng}`).join('|');
        const originsStr = formatLocations(origins);
        const destinationsStr = formatLocations(destinations);
        // Check cache
        const cacheKey = `${originsStr}-${destinationsStr}-${mode}`;
        if (cache.has(cacheKey)) {
            console.log('Serving from cache:', cacheKey);
            return server_1.NextResponse.json(cache.get(cacheKey));
        }
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status !== 'OK') {
            console.error('Google Maps API Error:', data);
            return server_1.NextResponse.json({ error: 'Failed to fetch distance matrix', details: data }, { status: 500 });
        }
        // Store in cache
        cache.set(cacheKey, data);
        return server_1.NextResponse.json(data);
    }
    catch (error) {
        console.error('Error in distance-matrix route:', error);
        return server_1.NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
