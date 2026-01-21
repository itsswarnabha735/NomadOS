import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const photoReference = searchParams.get('photoReference');
    const maxWidth = searchParams.get('maxWidth') || '400';
    const placeName = searchParams.get('place');

    if (!GOOGLE_MAPS_API_KEY) {
        return NextResponse.json(
            { error: 'Google Maps API key not configured' },
            { status: 500 }
        );
    }

    // If photoReference is provided, redirect directly to Google Places photo
    if (photoReference) {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
        return NextResponse.redirect(photoUrl);
    }

    if (!placeName) {
        return NextResponse.json(
            { error: 'Place name or photoReference is required' },
            { status: 400 }
        );
    }

    try {
        // Step 1: Search for the place using Places API Text Search
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(placeName)}&key=${GOOGLE_MAPS_API_KEY}`;

        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
            return NextResponse.json(
                { error: 'Place not found', fallback: true },
                { status: 404 }
            );
        }

        const place = searchData.results[0];

        // Step 2: Check if the place has photos
        if (!place.photos || place.photos.length === 0) {
            return NextResponse.json(
                { error: 'No photos available for this place', fallback: true },
                { status: 404 }
            );
        }

        const photoReference = place.photos[0].photo_reference;

        // Step 3: Construct the photo URL
        // We'll use maxwidth=800 for good quality while keeping file size reasonable
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;

        return NextResponse.json(
            {
                url: photoUrl,
                placeName: place.name,
                placeId: place.place_id
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
                }
            }
        );

    } catch (error) {
        console.error('Error fetching place photo:', error);
        return NextResponse.json(
            { error: 'Failed to fetch place photo', fallback: true },
            { status: 500 }
        );
    }
}
