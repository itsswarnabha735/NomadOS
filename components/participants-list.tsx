"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, arrayRemove, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TripParticipant } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserMinus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParticipantsListProps {
    tripId: string;
    currentUserId?: string;
    isOwner: boolean;
}

export function ParticipantsList({ tripId, currentUserId, isOwner }: ParticipantsListProps) {
    const [participants, setParticipants] = useState<TripParticipant[]>([]);

    useEffect(() => {
        if (tripId) {
            const q = query(collection(db, "trips", tripId, "participants"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const parts: TripParticipant[] = [];
                snapshot.forEach((doc) => {
                    parts.push(doc.data() as TripParticipant);
                });
                setParticipants(parts);
            });
            return () => unsubscribe();
        }
    }, [tripId]);

    const handleRemoveParticipant = async (participantId: string) => {
        if (!currentUserId || !tripId || !confirm("Remove this participant?")) return;

        try {
            // Remove from subcollection
            await deleteDoc(doc(db, "trips", tripId, "participants", participantId));

            // Update trip participant count and array in the owner's trip document
            // Since isOwner is true, currentUserId is the owner
            await updateDoc(doc(db, "users", currentUserId, "trips", tripId), {
                participants: arrayRemove(participantId),
                participantCount: increment(-1)
            });

            // Note: We should also ideally remove it from the participant's shared_trips collection
            // but we can't easily do that from here without their permission or a backend function.
            // For now, the participant will still see it but access will be denied by rules if we set them up right.

        } catch (error) {
            console.error("Error removing participant:", error);
        }
    };

    return (
        <ScrollArea className="h-[200px] rounded-md border p-4">
            {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No one has joined yet.</p>
            ) : (
                <div className="space-y-3">
                    {participants.map((p) => (
                        <div key={p.userId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={p.userAvatar} />
                                    <AvatarFallback>{p.userName?.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{p.userName}</span>
                                    <span className="text-xs text-muted-foreground capitalize">{p.role}</span>
                                </div>
                            </div>
                            {isOwner && p.role !== 'owner' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveParticipant(p.userId)}
                                >
                                    <UserMinus className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
    );
}
