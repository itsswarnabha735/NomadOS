/**
 * Service for fetching place-related data from Google Places API
 */

const DEFAULT_TRIP_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

export interface PlacePhotoResponse {
    url: string;
    placeName?: string;
    placeId?: string;
}

/**
 * Fetches a photo URL for a given place name using Google Places API
 * @param placeName - The name of the place to search for
 * @returns Promise<string> - The photo URL or a fallback default image
 */
export async function getPlaceImageUrl(placeName: string): Promise<string> {
    if (!placeName || placeName.trim() === '') {
        return DEFAULT_TRIP_IMAGE;
    }

    try {
        const response = await fetch(`/api/place-photo?place=${encodeURIComponent(placeName)}`);

        if (!response.ok) {
            console.warn(`Failed to fetch photo for ${placeName}, using default image`);
            return DEFAULT_TRIP_IMAGE;
        }

        const data: PlacePhotoResponse = await response.json();
        return data.url || DEFAULT_TRIP_IMAGE;
    } catch (error) {
        console.error('Error fetching place image:', error);
        return DEFAULT_TRIP_IMAGE;
    }
}

/**
 * Fetches photo URLs for multiple places
 * @param placeNames - Array of place names
 * @returns Promise<string[]> - Array of photo URLs
 */
export async function getPlaceImageUrls(placeNames: string[]): Promise<string[]> {
    const promises = placeNames.map(name => getPlaceImageUrl(name));
    return Promise.all(promises);
}
