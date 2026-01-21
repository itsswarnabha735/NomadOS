"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveTSP = solveTSP;
exports.solveHierarchicalTSP = solveHierarchicalTSP;
function solveTSP(locations, distanceMatrix) {
    if (locations.length <= 2)
        return locations;
    const visited = new Set();
    const path = [];
    const n = locations.length;
    // Helper to parse "HH:mm" to minutes from midnight
    const parseTime = (timeStr) => {
        if (!timeStr)
            return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };
    // If no distance matrix provided, fallback to Haversine (for backward compatibility or testing)
    const getDistance = (i, j) => {
        if (distanceMatrix) {
            // distanceMatrix values are in seconds. Convert to minutes.
            return Math.ceil(distanceMatrix[i][j] / 60);
        }
        // Haversine returns km. Assume 30km/h avg speed -> 0.5 km/min -> 2 mins per km
        return Math.ceil(calculateHaversineDistance(locations[i], locations[j]) * 2);
    };
    // Start with the first location (usually the hotel or starting point)
    let currentIndex = 0;
    path.push(locations[currentIndex]);
    visited.add(currentIndex);
    // Track current time (minutes from midnight). Assume start at 9:00 AM (540 mins)
    let currentTime = 540;
    while (visited.size < n) {
        let nearestIndex = -1;
        let bestScore = Infinity; // Lower is better (combination of distance and wait time)
        for (let i = 0; i < n; i++) {
            if (!visited.has(i)) {
                const travelTime = getDistance(currentIndex, i);
                const arrivalTime = currentTime + travelTime;
                const openTime = parseTime(locations[i].openingTime);
                const closeTime = parseTime(locations[i].closingTime);
                let waitTime = 0;
                let penalty = 0;
                // Check Opening Time
                if (openTime !== null && arrivalTime < openTime) {
                    waitTime = openTime - arrivalTime;
                }
                // Check Closing Time
                if (closeTime !== null && (arrivalTime + waitTime) > closeTime) {
                    penalty = 10000; // Huge penalty for arriving after closing
                }
                // Score = Travel Time + Wait Time + Penalty
                // We prefer closer places, but also ones that are open
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
            // Update current time
            const travelTime = getDistance(currentIndex, nearestIndex);
            let arrivalTime = currentTime + travelTime;
            const openTime = parseTime(locations[nearestIndex].openingTime);
            if (openTime !== null && arrivalTime < openTime) {
                arrivalTime = openTime; // Wait until open
            }
            // Add duration (default 60 mins if not specified)
            const duration = locations[nearestIndex].duration || 60;
            currentTime = arrivalTime + duration;
            currentIndex = nearestIndex;
        }
        else {
            break; // Should not happen
        }
    }
    return path;
}
function solveHierarchicalTSP(allLocations, placeDistanceMatrix) {
    // 1. Separate Places (parents) and POIs (children)
    const places = allLocations.filter(l => !l.parentId);
    const pois = allLocations.filter(l => l.parentId);
    // 2. Optimize Places first
    // We use the provided distance matrix for Places
    const optimizedPlaces = solveTSP(places, placeDistanceMatrix);
    // 3. Optimize POIs within each Place and flatten the result
    let finalPath = [];
    optimizedPlaces.forEach(place => {
        // Add the Place itself
        finalPath.push(place);
        // Find POIs for this Place
        const placePois = pois.filter(p => p.parentId === place.id);
        if (placePois.length > 0) {
            // Optimize POIs
            // For POIs within a place, we use Haversine distance as they are close
            // and we don't want to waste API calls for walking distances inside a venue
            // We assume the start point for POI optimization is the Place itself (or the first POI)
            // To do this, we can treat the Place as the "start" node for the POI TSP, 
            // but we don't want to duplicate the Place in the output.
            // So we optimize the POIs relative to the Place.
            // Simple approach: Just optimize POIs among themselves using Haversine
            const optimizedPois = solveTSP(placePois);
            finalPath.push(...optimizedPois);
        }
    });
    return finalPath;
}
function calculateHaversineDistance(loc1, loc2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(loc2.lat - loc1.lat);
    const dLon = deg2rad(loc2.lng - loc1.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(loc1.lat)) * Math.cos(deg2rad(loc2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
