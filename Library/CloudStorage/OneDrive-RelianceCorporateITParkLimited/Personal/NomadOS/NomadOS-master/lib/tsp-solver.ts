export interface Location {
    lat: number;
    lng: number;
    name: string;
    id?: string;
    parentId?: string;
    openingTime?: string;
    closingTime?: string;
    duration?: number;
}

type DistanceMatrix = number[][];

export function solveTSP(locations: Location[], distanceMatrix?: DistanceMatrix, lockFirst: boolean = false, lockLast: boolean = false): Location[] {
    console.log('[TSP-SOLVE] solveTSP called with', locations.length, 'locations, lockFirst:', lockFirst, 'lockLast:', lockLast);
    console.log('[TSP-SOLVE] Input order:', locations.map(l => l.name));

    if (locations.length <= 2) {
        return locations;
    }

    const visited = new Set<number>();
    const path: Location[] = [];
    const n = locations.length;

    const parseTime = (timeStr?: string): number | null => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const getDistance = (i: number, j: number): number => {
        if (distanceMatrix) {
            return Math.ceil(distanceMatrix[i][j] / 60);
        }
        return Math.ceil(calculateHaversineDistance(locations[i], locations[j]) * 2);
    };

    // Handle locked endpoint - exclude it from optimization
    const lastIndex = n - 1;
    if (lockLast) {
        visited.add(lastIndex); // Mark as visited so it's excluded from greedy algorithm
        console.log('[TSP-SOLVE] Locking last location:', locations[lastIndex].name);
    }

    let currentIndex = 0;
    path.push(locations[currentIndex]);
    visited.add(currentIndex);
    let currentTime = 540;

    while (visited.size < n) {
        let nearestIndex = -1;
        let bestScore = Infinity;

        for (let i = 0; i < n; i++) {
            if (!visited.has(i)) {
                const travelTime = getDistance(currentIndex, i);
                const arrivalTime = currentTime + travelTime;
                const openTime = parseTime(locations[i].openingTime);
                const closeTime = parseTime(locations[i].closingTime);

                let waitTime = 0;
                let penalty = 0;

                if (openTime !== null && arrivalTime < openTime) {
                    waitTime = openTime - arrivalTime;
                }

                if (closeTime !== null && (arrivalTime + waitTime) > closeTime) {
                    penalty = 10000;
                }

                const score = travelTime + waitTime + penalty;

                if (score < bestScore) {
                    bestScore = score;
                    nearestIndex = i;
                }
            }
        }

        if (nearestIndex !== -1) {
            path.push(locations[nearestIndex]);
            visited.add(nearestIndex);

            const travelTime = getDistance(currentIndex, nearestIndex);
            let arrivalTime = currentTime + travelTime;

            const openTime = parseTime(locations[nearestIndex].openingTime);
            if (openTime !== null && arrivalTime < openTime) {
                arrivalTime = openTime;
            }

            const duration = locations[nearestIndex].duration || 60;
            currentTime = arrivalTime + duration;
            currentIndex = nearestIndex;
        } else {
            break;
        }
    }

    // Add locked endpoint to the end if it was excluded from optimization
    if (lockLast) {
        path.push(locations[lastIndex]);
        console.log('[TSP-SOLVE] Added locked endpoint to path:', locations[lastIndex].name);
    }

    return path;
}

export function solveHierarchicalTSP(allLocations: Location[], placeDistanceMatrix?: DistanceMatrix, lockLast: boolean = false): Location[] {
    console.log('[TSP] === POI-ONLY OPTIMIZATION ===');
    console.log('[TSP] Input:', allLocations.map(l => ({ name: l.name, parentId: l.parentId })));

    if (allLocations.length === 0) return [];

    const startLocation = allLocations[0];
    console.log('[TSP] START:', startLocation.name);

    const pois = allLocations.filter(l => l.parentId);

    console.log('[TSP] Filtering for POIs only');
    console.log('[TSP] Found', pois.length, 'POIs:', pois.map(p => p.name));

    if (pois.length === 0) {
        console.log('[TSP] No POIs found, returning empty');
        return [];
    }

    console.log('[TSP] Optimizing with lockFirst=true, lockLast:', lockLast);
    const optimizedPois = solveTSP(pois, undefined, true, lockLast);

    console.log('[TSP] *** FINAL:', optimizedPois.map(l => l.name));
    console.log('[TSP] *** FIRST:', optimizedPois[0]?.name);

    return optimizedPois;
}

function calculateHaversineDistance(loc1: Location, loc2: Location): number {
    const R = 6371;
    const dLat = deg2rad(loc2.lat - loc1.lat);
    const dLon = deg2rad(loc2.lng - loc1.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(loc1.lat)) * Math.cos(deg2rad(loc2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}
