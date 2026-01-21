import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, query, where, getDocs, deleteDoc, Timestamp } from "firebase/firestore";

// Characters to use for share code (excluding ambiguous ones like I, l, 1, 0, O)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Generates a random 8-character alphanumeric code.
 * Format: XXXX-YYYY
 */
function generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        if (i === 3) code += '-';
    }
    return code;
}

/**
 * Generates a unique share code for a trip.
 * Checks against Firestore to ensure uniqueness.
 */
export async function generateUniqueShareCode(tripId: string, ownerId: string): Promise<string> {
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const code = generateCode();
        const codeRef = doc(db, "shareCodes", code);
        const codeSnap = await getDoc(codeRef);

        if (!codeSnap.exists()) {
            // Code is unique, reserve it
            await setDoc(codeRef, {
                code,
                tripId,
                ownerId,
                createdAt: Timestamp.now(),
                isActive: true,
                usageCount: 0
            });
            return code;
        }
        attempts++;
    }

    throw new Error("Failed to generate unique share code after multiple attempts");
}

/**
 * Validates a share code and returns the trip ID if valid.
 */
export async function validateShareCode(code: string): Promise<{ tripId: string; ownerId: string } | null> {
    // Normalize code (uppercase)
    const normalizedCode = code.toUpperCase().trim();

    const codeRef = doc(db, "shareCodes", normalizedCode);
    const codeSnap = await getDoc(codeRef);

    if (codeSnap.exists() && codeSnap.data().isActive) {
        return {
            tripId: codeSnap.data().tripId,
            ownerId: codeSnap.data().ownerId
        };
    }

    return null;
}

/**
 * Deactivates a share code.
 */
export async function deactivateShareCode(code: string): Promise<void> {
    const codeRef = doc(db, "shareCodes", code);
    await deleteDoc(codeRef);
}

/**
 * Gets the active share code for a trip, if any.
 */
export async function getActiveShareCode(tripId: string): Promise<string | null> {
    const q = query(collection(db, "shareCodes"), where("tripId", "==", tripId), where("isActive", "==", true));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }

    return null;
}
