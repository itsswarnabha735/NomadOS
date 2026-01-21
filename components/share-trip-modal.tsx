"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, RefreshCw, Trash2, Share2, UserMinus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { generateUniqueShareCode, getActiveShareCode, deactivateShareCode } from "@/lib/share-service";
import { Trip, TripParticipant } from "@/types";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, arrayRemove, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParticipantsList } from "@/components/participants-list";

interface ShareTripModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
}

export function ShareTripModal({ open, onOpenChange, trip }: ShareTripModalProps) {
    const { user } = useAuth();
    const [shareCode, setShareCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [participants, setParticipants] = useState<TripParticipant[]>([]);
    const [generating, setGenerating] = useState(false);

    // Load active share code
    useEffect(() => {
        if (open && trip.id) {
            const loadCode = async () => {
                const code = await getActiveShareCode(trip.id);
                setShareCode(code);
            };
            loadCode();
        }
    }, [open, trip.id]);

    // Listen to participants
    useEffect(() => {
        if (open && trip.id) {
            const q = query(collection(db, "trips", trip.id, "participants"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const parts: TripParticipant[] = [];
                snapshot.forEach((doc) => {
                    parts.push(doc.data() as TripParticipant);
                });
                setParticipants(parts);
            });
            return () => unsubscribe();
        }
    }, [open, trip.id]);

    const handleGenerateCode = async () => {
        if (!user || !trip.id) return;
        setGenerating(true);
        try {
            const code = await generateUniqueShareCode(trip.id, user.uid);
            setShareCode(code);

            // Update trip document to reflect sharing status
            await updateDoc(doc(db, "users", user.uid, "trips", trip.id), {
                isShared: true,
                shareCode: code
            });
        } catch (error) {
            console.error("Error generating code:", error);
        } finally {
            setGenerating(false);
        }
    };

    const handleDeactivateCode = async () => {
        if (!shareCode || !confirm("Are you sure? The current code will stop working.")) return;
        try {
            await deactivateShareCode(shareCode);
            setShareCode(null);

            // Update trip document
            if (user && trip.id) {
                await updateDoc(doc(db, "users", user.uid, "trips", trip.id), {
                    shareCode: null
                });
            }
        } catch (error) {
            console.error("Error deactivating code:", error);
        }
    };

    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (shareCode) {
            navigator.clipboard.writeText(shareCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // ... inside return ...
    <Button size="icon" variant="outline" onClick={handleCopyCode} title="Copy Code">
        {copied ? <span className="font-bold text-green-600">✓</span> : <Copy className="h-4 w-4" />}
    </Button>

    const handleWhatsAppShare = () => {
        if (!shareCode) return;
        const text = `Join my trip "${trip.name || trip.destination}" on NomadOS! Use code: ${shareCode}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleRemoveParticipant = async (participantId: string) => {
        if (!user || !trip.id || !confirm("Remove this participant?")) return;

        try {
            // Remove from subcollection
            await deleteDoc(doc(db, "trips", trip.id, "participants", participantId));

            // Update trip participant count and array
            await updateDoc(doc(db, "users", user.uid, "trips", trip.id), {
                participants: arrayRemove(participantId),
                participantCount: increment(-1)
            });

            // Also remove from user's sharedTrips (this would require a cloud function or trusted environment ideally, 
            // but we can try client side if rules allow, or just leave it for now)
        } catch (error) {
            console.error("Error removing participant:", error);
        }
    };

    const isOwner = user?.uid === trip.ownerId || user?.uid === (trip as any).userId; // Handle legacy userId

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Trip</DialogTitle>
                    <DialogDescription>
                        Invite friends to collaborate on this trip.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Share Code Section */}
                    <div className="space-y-2">
                        <Label>Share Code</Label>
                        {shareCode ? (
                            <div className="flex items-center gap-2">
                                <div className="flex-1 p-3 bg-muted rounded-md font-mono text-center text-lg tracking-widest border">
                                    {shareCode}
                                </div>
                                <Button size="icon" variant="outline" onClick={handleCopyCode} title="Copy Code">
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="destructive" onClick={handleDeactivateCode} title="Revoke Code">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={handleGenerateCode} disabled={generating} className="w-full">
                                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Generate Invite Code
                            </Button>
                        )}
                    </div>

                    {/* WhatsApp Share */}
                    {shareCode && (
                        <Button onClick={handleWhatsAppShare} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
                            <Share2 className="mr-2 h-4 w-4" /> Share via WhatsApp
                        </Button>
                    )}

                    {/* Participants List */}
                    <div className="space-y-2">
                        <Label>Participants</Label>
                        <ParticipantsList
                            tripId={trip.id}
                            currentUserId={user?.uid}
                            isOwner={isOwner}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
