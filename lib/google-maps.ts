const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_API_KEY;

export interface Location {
    id: string;
    lat: number;
    lng: number;
}

export interface TravelTime {
    fromId: string;
    toId: string;
    durationSeconds: number;
    distanceMeters: number;
}

export async function getTravelTimes(
    origins: Location[],
    destinations: Location[],
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<TravelTime[]> {

    if (!GOOGLE_MAPS_API_KEY) {
        console.warn("Missing GOOGLE_MAPS_API_KEY, skipping distance matrix.");
        return [];
    }

    // Google Maps Distance Matrix API limits (e.g. 100 elements per request).
    // For now, we assume reasonable input size (< 10 locations = 100 elements).

    const originStr = origins.map(l => `${l.lat},${l.lng}`).join('|');
    const destStr = destinations.map(l => `${l.lat},${l.lng}`).join('|');

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destStr}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Distance Matrix API error:', data.error_message || data.status);
            return [];
        }

        const results: TravelTime[] = [];

        data.rows.forEach((row: any, i: number) => {
            const fromLoc = origins[i];
            row.elements.forEach((element: any, j: number) => {
                const toLoc = destinations[j];

                if (element.status === 'OK') {
                    results.push({
                        fromId: fromLoc.id,
                        toId: toLoc.id,
                        durationSeconds: element.duration.value,
                        distanceMeters: element.distance.value
                    });
                }
            });
        });

        return results;

    } catch (error) {
        console.error('Failed to fetch distance matrix:', error);
        return [];
    }
}
