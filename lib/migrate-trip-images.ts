/**
 * Migration Script: Update Existing Trips with Destination-Specific Images
 * 
 * This script updates all existing trips that have the old placeholder image
 * with new destination-specific images from Google Places API.
 * 
 * Run this from the browser console when logged in to update your trips.
 */

import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPlaceImageUrl } from "@/lib/place-service";

const OLD_PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800";

export async function migrateExistingTripImages(userId: string) {
    console.log("Starting trip image migration...");

    try {
        // Get all user's trips
        const tripsRef = collection(db, "users", userId, "trips");
        const snapshot = await getDocs(tripsRef);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const tripDoc of snapshot.docs) {
            const tripData = tripDoc.data();

            // Check if trip has the old placeholder image or no image
            if (!tripData.image || tripData.image.includes(OLD_PLACEHOLDER_IMAGE)) {
                // Get the first destination
                const firstDestination = tripData.destinations?.[0] || tripData.destination?.split(",")[0]?.trim();

                if (firstDestination) {
                    console.log(`Updating image for trip: ${tripData.name || tripData.destination}`);

                    // Fetch new image
                    const newImageUrl = await getPlaceImageUrl(firstDestination);

                    // Update the trip
                    await updateDoc(doc(db, "users", userId, "trips", tripDoc.id), {
                        image: newImageUrl
                    });

                    updatedCount++;
                } else {
                    console.warn(`No destination found for trip: ${tripDoc.id}`);
                    skippedCount++;
                }
            } else {
                console.log(`Skipping trip ${tripData.name || tripData.destination} - already has custom image`);
                skippedCount++;
            }
        }

        console.log(`Migration complete! Updated: ${updatedCount}, Skipped: ${skippedCount}`);
        return { updatedCount, skippedCount };
    } catch (error) {
        console.error("Error during migration:", error);
        throw error;
    }
}
