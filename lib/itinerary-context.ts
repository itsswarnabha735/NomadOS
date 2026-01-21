// Itinerary Context Helper for Budget Predictions
// Extracts POI information from trip itinerary for cost estimation

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ItineraryContext {
    poiCount: number;
    poiTypes: string[];
    poiNames: string[];
}

// Map place types to activity categories
const POI_TYPE_MAPPING: Record<string, string> = {
    // Attractions
    'museum': 'museum',
    'art_gallery': 'museum',
    'tourist_attraction': 'attraction',
    'amusement_park': 'theme_park',
    'zoo': 'zoo',
    'aquarium': 'aquarium',

    // Nature
    'park': 'park',
    'natural_feature': 'nature',
    'hiking_area': 'hiking',
    'beach': 'beach',

    // Food & Drink
    'restaurant': 'restaurant',
    'cafe': 'cafe',
    'bar': 'bar',
    'bakery': 'bakery',

    // Entertainment
    'night_club': 'nightlife',
    'casino': 'casino',
    'movie_theater': 'cinema',
    'stadium': 'sports',
    'bowling_alley': 'entertainment',

    // Shopping
    'shopping_mall': 'shopping',
    'department_store': 'shopping',
    'clothing_store': 'shopping',
    'supermarket': 'shopping',

    // Wellness
    'spa': 'spa',
    'gym': 'fitness',

    // Religious/Cultural
    'church': 'religious_site',
    'mosque': 'religious_site',
    'temple': 'religious_site',
    'synagogue': 'religious_site',

    // Transit
    'airport': 'transit',
    'train_station': 'transit',
    'bus_station': 'transit',
};

/**
 * Categorize POI types into broader activity categories
 */
function categorizePoiTypes(types: string[]): string[] {
    const categories = new Set<string>();

    for (const type of types) {
        const category = POI_TYPE_MAPPING[type.toLowerCase()];
        if (category) {
            categories.add(category);
        } else {
            // Default to the type itself for unknown types
            categories.add(type.replace(/_/g, ' '));
        }
    }

    return Array.from(categories);
}

/**
 * Detect special activities that might need custom budget categories
 */
function detectSpecialActivities(poiNames: string[], poiTypes: string[]): string[] {
    const specialActivities: string[] = [];
    const combinedText = [...poiNames, ...poiTypes].join(' ').toLowerCase();

    // Skiing/Winter sports
    if (combinedText.includes('ski') || combinedText.includes('snowboard')) {
        specialActivities.push('Ski/Snowboard');
    }

    // Scuba/Water sports
    if (combinedText.includes('scuba') || combinedText.includes('diving') || combinedText.includes('snorkel')) {
        specialActivities.push('Water Sports');
    }

    // Spa/Wellness
    if (combinedText.includes('spa') || combinedText.includes('wellness') || combinedText.includes('massage')) {
        specialActivities.push('Spa/Wellness');
    }

    // Golf
    if (combinedText.includes('golf')) {
        specialActivities.push('Golf');
    }

    // Theme parks
    if (combinedText.includes('disney') || combinedText.includes('universal') || combinedText.includes('theme park')) {
        specialActivities.push('Theme Parks');
    }

    // Wine/Brewery tours
    if (combinedText.includes('winery') || combinedText.includes('brewery') || combinedText.includes('vineyard')) {
        specialActivities.push('Wine/Brewery Tours');
    }

    // Safari
    if (combinedText.includes('safari') || combinedText.includes('game reserve')) {
        specialActivities.push('Safari');
    }

    return specialActivities;
}

/**
 * Fetch itinerary context for a trip from Firestore
 */
export async function getItineraryContext(tripId: string): Promise<ItineraryContext> {
    try {
        const itineraryRef = collection(db, 'trips', tripId, 'itinerary');
        const snapshot = await getDocs(itineraryRef);

        const poiNames: string[] = [];
        const allTypes: string[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();

            // Each itinerary document may have multiple POIs
            if (data.pois && Array.isArray(data.pois)) {
                for (const poi of data.pois) {
                    if (poi.name) {
                        poiNames.push(poi.name);
                    }
                    if (poi.types && Array.isArray(poi.types)) {
                        allTypes.push(...poi.types);
                    }
                    // Also check for category field
                    if (poi.category) {
                        allTypes.push(poi.category);
                    }
                }
            }

            // Handle flat structure (single POI per document)
            if (data.name) {
                poiNames.push(data.name);
            }
            if (data.types && Array.isArray(data.types)) {
                allTypes.push(...data.types);
            }
            if (data.category) {
                allTypes.push(data.category);
            }
        });

        // Categorize and deduplicate types
        const categorizedTypes = categorizePoiTypes(allTypes);

        // Detect special activities
        const specialActivities = detectSpecialActivities(poiNames, allTypes);
        const allActivityTypes = [...new Set([...categorizedTypes, ...specialActivities])];

        console.log('[ItineraryContext] Extracted:', {
            poiCount: poiNames.length,
            types: allActivityTypes.slice(0, 10),
        });

        return {
            poiCount: poiNames.length,
            poiTypes: allActivityTypes,
            poiNames,
        };

    } catch (error) {
        console.error('[ItineraryContext] Error fetching:', error);
        return {
            poiCount: 0,
            poiTypes: [],
            poiNames: [],
        };
    }
}

/**
 * Estimate activity costs based on POI types
 * Returns suggested percentage allocation for Activities category
 */
export function estimateActivityIntensity(context: ItineraryContext): 'low' | 'medium' | 'high' {
    if (context.poiCount === 0) {
        return 'low';
    }

    // Calculate intensity based on:
    // 1. Number of POIs
    // 2. Types of activities (expensive vs free)

    const expensiveTypes = ['museum', 'theme_park', 'zoo', 'aquarium', 'casino', 'spa', 'golf'];
    const expensiveCount = context.poiTypes.filter(t => expensiveTypes.includes(t)).length;

    if (context.poiCount >= 10 || expensiveCount >= 3) {
        return 'high';
    }

    if (context.poiCount >= 5 || expensiveCount >= 1) {
        return 'medium';
    }

    return 'low';
}
