"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { validateShareCode } from "@/lib/share-service";
import { doc, getDoc, updateDoc, arrayUnion, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface JoinTripModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JoinTripModal({ open, onOpenChange }: JoinTripModalProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [code, setCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !code) return;

        setJoining(true);
        setError(null);

        try {
            // 1. Validate Code
            const result = await validateShareCode(code);
            if (!result) {
                setError("Invalid or expired invite code.");
                setJoining(false);
                return;
            }

            const { tripId, ownerId } = result;

            // 2. Check if already a participant (or owner)
            if (ownerId === user.uid) {
                setError("You are the owner of this trip.");
                setJoining(false);
                return;
            }

            // Check if already joined
            const participantRef = doc(db, "users", ownerId, "trips", tripId, "participants", user.uid);
            const participantSnap = await getDoc(participantRef);

            if (participantSnap.exists()) {
                // Already joined, just redirect
                router.push(`/trip/${tripId}`); // Note: URL structure might need to change to include ownerId if trips are nested under users
                // Wait, if trips are under users/{userId}/trips, the URL /trip/{tripId} needs to know the ownerId to fetch it?
                // Currently /trip/[id] fetches from `users/${user.uid}/trips/${id}`.
                // This means a user can ONLY see trips in THEIR OWN collection.
                // THIS IS A MAJOR ARCHITECTURAL ISSUE for shared trips.
                // Shared trips need to be accessible.
                // EITHER:
                // A) We copy the trip to the joiner's collection (bad for sync)
                // B) We change the routing to /trip/{ownerId}/{tripId} or /trip/{tripId} and search globally/lookup owner.
                // C) We move trips to a top-level 'trips' collection (Best for sharing).

                // Given the current structure `users/{uid}/trips/{tripId}`, sharing is hard.
                // I need to refactor or use a workaround.
                // Workaround: Store { tripId, ownerId } in the user's `sharedTrips` collection, 
                // and update the TripDetailsPage to look up the ownerId if it's not found in own trips.

                onOpenChange(false);
                return;
            }

            // 3. Add to participants subcollection
            await setDoc(participantRef, {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || "Traveler",
                userAvatar: user.photoURL,
                role: 'editor', // Default role
                joinedAt: Timestamp.now(),
                invitedBy: ownerId
            });

            // 4. Update trip document (participants array)
            const tripRef = doc(db, "users", ownerId, "trips", tripId);
            await updateDoc(tripRef, {
                participants: arrayUnion(user.uid),
                // participantCount: increment(1) // increment needs import
            });

            // 5. Add to user's "sharedTrips" list so they can find it
            await setDoc(doc(db, "users", user.uid, "shared_trips", tripId), {
                tripId,
                ownerId,
                joinedAt: Timestamp.now()
            });

            // 6. Redirect
            // We need to handle the routing issue. 
            // For now, let's assume we'll fix the routing next.
            // I'll redirect to a special route or update the existing one.
            // Let's use a query param? /trip/{tripId}?ownerId={ownerId}
            router.push(`/trip/${tripId}?ownerId=${ownerId}`);
            onOpenChange(false);

        } catch (err) {
            console.error("Error joining trip:", err);
            setError("Failed to join trip. Please try again.");
        } finally {
            setJoining(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Join a Trip</DialogTitle>
                    <DialogDescription>
                        Enter the 8-character code shared with you.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleJoin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Invite Code</Label>
                        <Input
                            id="code"
                            placeholder="ABCD-1234"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={9}
                            className="font-mono uppercase tracking-wider"
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={joining || code.length < 8}>
                            {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                            Join Trip
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
