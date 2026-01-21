"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Calendar, MapPin, Trash2, X, LogOut, Search, Users } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, Timestamp, getDoc, setDoc, updateDoc, arrayUnion, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleMapsWrapper } from "@/components/google-maps-wrapper"
import { PlacesAutocomplete } from "@/components/places-autocomplete"
import { auth } from "@/lib/firebase"

import { Trip } from "@/types";

import { UserProfileDialog } from "@/components/user-profile-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings } from "lucide-react"

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [newTripOpen, setNewTripOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [tripName, setTripName] = useState("");
    const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [creating, setCreating] = useState(false);
    const [sharedTrips, setSharedTrips] = useState<Trip[]>([]);
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [migrating, setMigrating] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            // Own Trips
            const q = query(collection(db, "users", user.uid, "trips"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const tripsData: Trip[] = [];
                snapshot.forEach((doc) => {
                    tripsData.push({ id: doc.id, ...doc.data() } as Trip);
                });
                setTrips(tripsData);
            });

            // Shared Trips
            const qShared = query(collection(db, "users", user.uid, "shared_trips"));
            const unsubscribeShared = onSnapshot(qShared, async (snapshot) => {
                const promises = snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();
                    // Fetch the actual trip data from the owner's collection
                    try {
                        const tripRef = doc(db, "users", data.ownerId, "trips", data.tripId);
                        const tripSnap = await getDoc(tripRef);
                        if (tripSnap.exists()) {
                            const tripData = tripSnap.data();

                            // Self-Healing: Check if user is still a participant
                            const participants = tripData.participants || [];
                            if (!participants.includes(user.uid)) {
                                console.log("User removed from trip, cleaning up shared_trip entry:", data.tripId);
                                await deleteDoc(docSnap.ref);
                                return null;
                            }

                            // Include ownerId in the trip object so we can link to it correctly
                            return { id: tripSnap.id, ...tripData, ownerId: data.ownerId } as Trip;
                        } else {
                            // Trip deleted by owner? Clean up
                            console.log("Trip no longer exists, cleaning up shared_trip entry:", data.tripId);
                            await deleteDoc(docSnap.ref);
                            return null;
                        }
                    } catch (e) {
                        console.error("Error fetching shared trip details:", e);
                    }
                    return null;
                });

                const results = await Promise.all(promises);
                setSharedTrips(results.filter(t => t !== null) as Trip[]);
            });

            return () => {
                unsubscribe();
                unsubscribeShared();
            };
        }
    }, [user]);

    const handleAddDestination = (place: google.maps.places.PlaceResult) => {
        const name = place.name || place.formatted_address;
        if (name && !selectedDestinations.includes(name)) {
            setSelectedDestinations([...selectedDestinations, name]);
        }
    };

    const handleRemoveDestination = (index: number) => {
        const newDestinations = [...selectedDestinations];
        newDestinations.splice(index, 1);
        setSelectedDestinations(newDestinations);
    };

    const handleCreateTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validation
        if (!tripName.trim()) {
            alert("Please enter a trip name.");
            return;
        }
        if (selectedDestinations.length === 0) {
            alert("Please add at least one destination.");
            return;
        }

        setCreating(true);
        try {
            // Fetch destination-specific image from Google Places API
            const { getPlaceImageUrl } = await import("@/lib/place-service");
            const tripImage = await getPlaceImageUrl(selectedDestinations[0]);

            await addDoc(collection(db, "users", user.uid, "trips"), {
                name: tripName,
                destinations: selectedDestinations,
                destination: selectedDestinations.join(", "), // Legacy support & display
                startDate,
                endDate,
                image: tripImage,
                ownerId: user.uid,
                createdAt: Timestamp.now(),
            });
            setNewTripOpen(false);
            setTripName("");
            setSelectedDestinations([]);
            setStartDate("");
            setEndDate("");
        } catch (error) {
            console.error("Error creating trip:", error);
        } finally {
            setCreating(false);
        }
    };

    const handleJoinTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !joinCode.trim()) return;

        setJoining(true);
        try {
            // 1. Validate Share Code
            const { validateShareCode } = await import("@/lib/share-service");
            const tripData = await validateShareCode(joinCode.trim());

            if (!tripData) {
                throw new Error("Invalid or expired share code");
            }

            const { tripId, ownerId } = tripData;

            if (ownerId === user.uid) {
                throw new Error("You are the owner of this trip");
            }

            // 2. Add to global participants collection
            // We'll store basic user info
            // Fetch latest profile data if available, otherwise fallback to auth user
            let displayName = user.displayName || "Anonymous";
            let photoURL = user.photoURL || "";

            // Try to get from Firestore profile if not in Auth object (or to get latest)
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    displayName = userData.displayName || displayName;
                    photoURL = userData.photoURL || photoURL;
                }
            } catch (e) {
                console.error("Error fetching user profile for join:", e);
            }

            const userProfileData = {
                userId: user.uid,
                userName: displayName,
                userAvatar: photoURL,
                role: 'editor',
                joinedAt: Timestamp.now()
            };

            await setDoc(doc(db, "trips", tripId, "participants", user.uid), userProfileData, { merge: true });

            // 3. Add to user's shared_trips collection
            await setDoc(doc(db, "users", user.uid, "shared_trips", tripId), {
                tripId,
                ownerId,
                joinedAt: Timestamp.now(),
                role: 'editor'
            });

            // 4. Update the trip document's participant count
            const tripRef = doc(db, "users", ownerId, "trips", tripId);
            await updateDoc(tripRef, {
                participantCount: increment(1),
                participants: arrayUnion(user.uid)
            });

            setJoinDialogOpen(false);
            setJoinCode("");
            alert("Successfully joined trip!");
        } catch (error) {
            console.error("Error joining trip:", error);
            alert(error instanceof Error ? error.message : "Failed to join trip");
        } finally {
            setJoining(false);
        }
    };

    const handleDeleteTrip = async (e: React.MouseEvent, tripId: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();
        if (!user) return;
        if (confirm("Are you sure you want to delete this trip?")) {
            try {
                await deleteDoc(doc(db, "users", user.uid, "trips", tripId));
            } catch (error) {
                console.error("Error deleting trip:", error);
            }
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        router.push("/");
    };

    const handleMigrateImages = async () => {
        if (!user) return;

        if (!confirm("This will update all your trip images with destination-specific photos from Google Places. Continue?")) {
            return;
        }

        setMigrating(true);
        try {
            const { migrateExistingTripImages } = await import("@/lib/migrate-trip-images");
            const result = await migrateExistingTripImages(user.uid);
            alert(`Migration complete! Updated ${result.updatedCount} trip(s), skipped ${result.skippedCount} trip(s).`);
        } catch (error) {
            console.error("Migration error:", error);
            alert("Failed to migrate trip images. Please try again.");
        } finally {
            setMigrating(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading your adventures...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <GoogleMapsWrapper>
            <div className="flex flex-col min-h-screen bg-slate-50/50">
                {/* Header */}
                <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-2 group">
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-lg font-bold font-heading tracking-tight">NomadOS</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 mr-2">
                                <Avatar className="h-8 w-8 border border-slate-200">
                                    <AvatarImage src={user.photoURL || undefined} />
                                    <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="hidden md:block text-sm">
                                    <p className="font-medium leading-none">{user.displayName || "Traveler"}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                            </div>

                            <Link href="/profile">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Profile
                                </Button>
                            </Link>

                            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </Button>

                            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Users className="h-4 w-4" /> Join Trip
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Join a Trip</DialogTitle>
                                        <DialogDescription>
                                            Enter the share code provided by the trip owner.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleJoinTrip} className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="joinCode">Share Code</Label>
                                            <Input
                                                id="joinCode"
                                                placeholder="Enter code..."
                                                value={joinCode}
                                                onChange={(e) => setJoinCode(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" disabled={joining} className="w-full">
                                            {joining ? "Joining..." : "Join Trip"}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            <Dialog open={newTripOpen} onOpenChange={setNewTripOpen}>
                                <DialogTrigger asChild>
                                    <Button className="shadow-lg shadow-primary/20">
                                        <Plus className="mr-2 h-4 w-4" /> New Trip
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0 border-none shadow-2xl">
                                    <DialogHeader className="p-6 pb-2 bg-slate-50/50 border-b border-slate-100">
                                        <DialogTitle className="text-xl font-heading">Plan a New Adventure</DialogTitle>
                                        <DialogDescription>
                                            Where to next? Fill in the details below.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="p-6">
                                        <form onSubmit={handleCreateTrip} className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="tripName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trip Name</Label>
                                                <Input
                                                    id="tripName"
                                                    value={tripName}
                                                    onChange={(e) => setTripName(e.target.value)}
                                                    placeholder="e.g., European Summer 2025"
                                                    required
                                                    className="h-12 text-lg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinations</Label>
                                                <PlacesAutocomplete onPlaceSelect={handleAddDestination} />
                                                <div className="flex flex-wrap gap-2 mt-3 min-h-[40px] p-2 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                                    {selectedDestinations.map((dest, index) => (
                                                        <div key={index} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-sm shadow-sm animate-in fade-in zoom-in duration-200">
                                                            <span className="font-medium text-slate-700">{dest}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveDestination(index)}
                                                                className="ml-1 text-slate-400 hover:text-destructive transition-colors"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {selectedDestinations.length === 0 && (
                                                        <p className="text-sm text-muted-foreground italic w-full text-center py-2">No destinations added yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="startDate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                                                    <Input
                                                        id="startDate"
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="endDate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label>
                                                    <Input
                                                        id="endDate"
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-4">
                                                <Button type="submit" disabled={creating} className="w-full h-12 text-base">
                                                    {creating ? "Creating Trip..." : "Create Adventure"}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </header>

                <main className="flex-1 container mx-auto px-4 py-8">
                    {/* Hero Section */}
                    <div className="mb-10 space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-bold font-heading text-slate-900 tracking-tight">
                                    Your Adventures
                                </h1>
                                <p className="text-lg text-muted-foreground max-w-2xl">
                                    Manage your upcoming trips, track your itineraries, and explore the world one destination at a time.
                                </p>
                            </div>
                            {trips.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMigrateImages}
                                    disabled={migrating}
                                    className="text-xs"
                                >
                                    {migrating ? "Updating Images..." : "Update Trip Images"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {trips.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="bg-slate-50 p-6 rounded-full mb-6">
                                <MapPin className="h-12 w-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No trips planned yet</h3>
                            <p className="text-muted-foreground mb-8 max-w-md">
                                The world is waiting! Start planning your next big adventure by creating a new trip.
                            </p>
                            <Button onClick={() => setNewTripOpen(true)} size="lg" className="shadow-lg shadow-primary/20">
                                <Plus className="mr-2 h-5 w-5" /> Plan First Trip
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {trips.map((trip) => (
                                <Link href={`/trip/${trip.id}`} key={trip.id} className="group block h-full">
                                    <Card className="h-full overflow-hidden border-0 bg-white ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-slate-900/10">
                                        <div className="aspect-[4/3] w-full overflow-hidden relative">
                                            <img
                                                src={trip.image}
                                                alt={trip.name || trip.destination}
                                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-3 right-3 h-8 w-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
                                                onClick={(e) => handleDeleteTrip(e, trip.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>

                                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                                <h3 className="font-bold text-lg leading-tight mb-1 drop-shadow-md">
                                                    {trip.name || trip.destination}
                                                </h3>
                                                {trip.destinations && trip.destinations.length > 0 && (
                                                    <div className="flex items-center text-white/90 text-xs font-medium">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        <span className="truncate">{trip.destinations.length} Stops</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                <div className="flex items-center bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                                                    <Calendar className="mr-2 h-3.5 w-3.5 text-primary" />
                                                    <span className="font-medium text-slate-700">
                                                        {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="mx-1 text-slate-300">→</span>
                                                    <span className="font-medium text-slate-700">
                                                        {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Shared Trips Section */}
                    {sharedTrips.length > 0 && (
                        <div className="mt-12 space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight flex items-center gap-2">
                                    <Users className="h-6 w-6 text-primary" />
                                    Shared Adventures
                                </h2>
                                <p className="text-muted-foreground">
                                    Trips you've been invited to join.
                                </p>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {sharedTrips.map((trip) => (
                                    <Link
                                        href={`/trip/${trip.id}?ownerId=${(trip as any).ownerId}`}
                                        key={trip.id}
                                        className="group block h-full"
                                    >
                                        <Card className="h-full overflow-hidden border-0 bg-white ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-slate-900/10">
                                            <div className="aspect-[4/3] w-full overflow-hidden relative">
                                                <img
                                                    src={trip.image}
                                                    alt={trip.name || trip.destination}
                                                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium text-slate-700 shadow-sm">
                                                    Shared
                                                </div>

                                                <div className="absolute bottom-3 left-3 right-3 text-white">
                                                    <h3 className="font-bold text-lg leading-tight mb-1 drop-shadow-md">
                                                        {trip.name || trip.destination}
                                                    </h3>
                                                    {trip.destinations && trip.destinations.length > 0 && (
                                                        <div className="flex items-center text-white/90 text-xs font-medium">
                                                            <MapPin className="h-3 w-3 mr-1" />
                                                            <span className="truncate">{trip.destinations.length} Stops</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <div className="flex items-center bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                                                        <Calendar className="mr-2 h-3.5 w-3.5 text-primary" />
                                                        <span className="font-medium text-slate-700">
                                                            {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <span className="mx-1 text-slate-300">→</span>
                                                        <span className="font-medium text-slate-700">
                                                            {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </GoogleMapsWrapper>
    )
}
