import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function POST(request: Request) {
    console.log('[OPTIMIZE-ROUTE] API endpoint called');

    if (!GOOGLE_MAPS_API_KEY) {
        console.error('[OPTIMIZE-ROUTE] Missing API Key');
        return NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { locations, mode = 'driving' } = body;

        console.log('[OPTIMIZE-ROUTE] Received request:', {
            locationCount: locations?.length,
            mode,
            locations: locations?.map((l: any) => ({ name: l.name, hasParent: !!l.parentId }))
        });

        if (!locations || !Array.isArray(locations) || locations.length < 2) {
            console.error('[OPTIMIZE-ROUTE] Invalid locations:', locations);
            return NextResponse.json({ error: 'At least 2 locations are required' }, { status: 400 });
        }

        // 1. Identify Places (top-level) for Distance Matrix
        // We only fetch real travel times for moving between Places.
        // POIs within a place are optimized using Haversine to save API costs.
        const places = locations.filter((l: any) => !l.parentId);
        console.log('[OPTIMIZE-ROUTE] Identified places:', places.length);

        let distanceMatrix: number[][] | undefined;

        if (places.length > 1) {
            const formatLocations = (locs: { lat: number; lng: number }[]) =>
                locs.map(l => `${l.lat},${l.lng}`).join('|');

            const locationsStr = formatLocations(places);
            console.log('[OPTIMIZE-ROUTE] Fetching distance matrix for', places.length, 'places');

            // We need a square matrix (all to all)
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(locationsStr)}&destinations=${encodeURIComponent(locationsStr)}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            console.log('[OPTIMIZE-ROUTE] Distance Matrix API response status:', data.status);

            if (data.status !== 'OK') {
                console.error('[OPTIMIZE-ROUTE] Google Maps API Error:', data);
                // Fallback to Haversine if API fails, or return error?
                // For now, let's log and continue with undefined matrix (will use Haversine)
            } else {
                // 2. Parse Distance Matrix
                distanceMatrix = data.rows.map((row: any) =>
                    row.elements.map((element: any) => {
                        if (element.status !== 'OK') return Infinity;
                        return element.duration.value;
                    })
                );
                console.log('[OPTIMIZE-ROUTE] Distance matrix parsed successfully');
            }
        } else {
            console.log('[OPTIMIZE-ROUTE] Only 1 place, skipping distance matrix');
        }

        // 3. Determine if endpoint should be locked
        const lockEndpoint = body.config?.endPoint?.type === 'specific_location';
        console.log('[OPTIMIZE-ROUTE] Lock endpoint:', lockEndpoint);

        // 4. Solve Hierarchical TSP (POI-only optimization)
        console.log('[OPTIMIZE-ROUTE] Calling solveHierarchicalTSP...');
        const { solveHierarchicalTSP } = await import('@/lib/tsp-solver');
        const optimizedPath = solveHierarchicalTSP(locations, distanceMatrix, lockEndpoint);

        console.log('[OPTIMIZE-ROUTE] Optimization complete. Path length:', optimizedPath.length);
        console.log('[OPTIMIZE-ROUTE] Optimized order:', optimizedPath.map(l => l.name));

        return NextResponse.json({ optimizedPath });
    } catch (error) {
        console.error('[OPTIMIZE-ROUTE] Error in optimize-route route:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
