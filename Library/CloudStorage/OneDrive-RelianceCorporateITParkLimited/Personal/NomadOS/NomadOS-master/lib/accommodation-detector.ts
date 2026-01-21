// Accommodation Detector for Budget Predictions
// Scans uploaded travel documents for hotel/Airbnb bookings

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DetectedAccommodation {
    name: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    source: 'document' | 'manual';
    documentId?: string;
    confidence: 'high' | 'medium' | 'low';
}

// Document categories that may contain accommodation info
const ACCOMMODATION_DOC_CATEGORIES = [
    'hotel',
    'accommodation',
    'booking',
    'airbnb',
    'hostel',
    'resort',
    'villa',
    'apartment',
];

// Document types that may contain accommodation info
const ACCOMMODATION_DOC_TYPES = [
    'hotel_booking',
    'accommodation_confirmation',
    'reservation',
    'booking_confirmation',
    'itinerary', // May contain hotel details
];

/**
 * Extract accommodation details from document metadata
 */
function extractAccommodationFromDocument(docData: any): DetectedAccommodation | null {
    // Check if document is accommodation-related
    const category = (docData.category || '').toLowerCase();
    const type = (docData.type || '').toLowerCase();
    const summary = (docData.summary || '').toLowerCase();

    const isAccommodation =
        ACCOMMODATION_DOC_CATEGORIES.some(cat => category.includes(cat)) ||
        ACCOMMODATION_DOC_TYPES.some(t => type.includes(t)) ||
        summary.includes('hotel') ||
        summary.includes('accommodation') ||
        summary.includes('check-in') ||
        summary.includes('airbnb') ||
        summary.includes('booking');

    if (!isAccommodation) {
        return null;
    }

    // Try to extract structured data
    let hotelName = docData.hotelName || docData.propertyName || docData.name;
    let checkIn = docData.checkIn || docData.checkInDate || docData.date;
    let checkOut = docData.checkOut || docData.checkOutDate;
    let nights = docData.nights;

    // If structured data not available, try to extract from summary
    if (!hotelName && summary) {
        // Look for hotel name patterns
        const hotelPatterns = [
            /(?:hotel|resort|hostel|airbnb|villa)(?:\s+)?:?\s*([^,\.]+)/i,
            /staying\s+at\s+([^,\.]+)/i,
            /accommodation\s+at\s+([^,\.]+)/i,
            /booked\s+([^,\.]+)/i,
        ];

        for (const pattern of hotelPatterns) {
            const match = summary.match(pattern);
            if (match) {
                hotelName = match[1].trim();
                break;
            }
        }
    }

    // Extract dates from summary if not available
    if (!checkIn && summary) {
        const datePattern = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\w+\s+\d{1,2},?\s+\d{4}/g;
        const dates = summary.match(datePattern);
        if (dates && dates.length >= 1) {
            checkIn = dates[0];
            if (dates.length >= 2) {
                checkOut = dates[1];
            }
        }
    }

    // Calculate nights if we have both dates
    if (checkIn && checkOut && !nights) {
        try {
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        } catch (e) {
            // Date parsing failed
        }
    }

    // Only return if we have at least a name
    if (hotelName) {
        return {
            name: hotelName,
            checkIn: checkIn || '',
            checkOut: checkOut || '',
            nights: nights || 0,
            source: 'document',
            documentId: docData.id,
            confidence: checkIn && checkOut ? 'high' : (checkIn ? 'medium' : 'low'),
        };
    }

    return null;
}

/**
 * Scan trip documents for accommodation information
 */
export async function detectAccommodation(tripId: string): Promise<DetectedAccommodation | null> {
    try {
        const documentsRef = collection(db, 'trips', tripId, 'documents');
        const snapshot = await getDocs(documentsRef);

        const detectedAccommodations: DetectedAccommodation[] = [];

        snapshot.forEach(doc => {
            const data = { ...doc.data(), id: doc.id };
            const accommodation = extractAccommodationFromDocument(data);
            if (accommodation) {
                detectedAccommodations.push(accommodation);
            }
        });

        if (detectedAccommodations.length === 0) {
            console.log('[AccommodationDetector] No accommodation found in documents');
            return null;
        }

        // Sort by confidence and return the best one
        detectedAccommodations.sort((a, b) => {
            const confidenceOrder = { high: 0, medium: 1, low: 2 };
            return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
        });

        const bestMatch = detectedAccommodations[0];
        console.log('[AccommodationDetector] Detected:', bestMatch);

        return bestMatch;

    } catch (error) {
        console.error('[AccommodationDetector] Error:', error);
        return null;
    }
}

/**
 * Check if accommodation covers the full trip duration
 */
export function validateAccommodationCoverage(
    accommodation: DetectedAccommodation,
    tripStartDate: string,
    tripEndDate: string
): { fullCoverage: boolean; missingNights: number } {
    if (!accommodation.checkIn || !accommodation.checkOut) {
        return { fullCoverage: false, missingNights: 0 };
    }

    try {
        const tripStart = new Date(tripStartDate);
        const tripEnd = new Date(tripEndDate);
        const accStart = new Date(accommodation.checkIn);
        const accEnd = new Date(accommodation.checkOut);

        const tripNights = Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));

        // Check if accommodation covers the trip
        const startsOnTime = accStart <= tripStart;
        const endsOnTime = accEnd >= tripEnd;

        if (startsOnTime && endsOnTime) {
            return { fullCoverage: true, missingNights: 0 };
        }

        // Calculate missing nights
        let missingNights = 0;
        if (!startsOnTime) {
            missingNights += Math.ceil((accStart.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
        }
        if (!endsOnTime) {
            missingNights += Math.ceil((tripEnd.getTime() - accEnd.getTime()) / (1000 * 60 * 60 * 24));
        }

        return { fullCoverage: false, missingNights };

    } catch (error) {
        return { fullCoverage: false, missingNights: 0 };
    }
}
