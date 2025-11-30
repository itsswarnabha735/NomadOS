"use client";

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, MapPin, Loader2, CloudRain, ChevronUp, ChevronDown, Map, X, ChevronRight } from "lucide-react"
import { Share } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { doc, getDoc, collection, query, onSnapshot, addDoc, orderBy, Timestamp, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"

import { getWeather } from "@/app/actions/get-weather"
import { GoogleMapsWrapper } from "@/components/google-maps-wrapper"
import { PlacesAutocomplete } from "@/components/places-autocomplete"
import { MapView } from "@/components/map-view"
import { WeatherButton } from "@/components/weather-button"
import { RouteSettings, RouteConfig } from "@/components/route-settings"
import { RouteVisualizationModal } from "@/components/route-visualization-modal"
import { TripDocs } from "@/components/trip-docs"
import { Trip, Activity, TravelDocument } from "@/types"
import { ShareTripModal } from "@/components/share-trip-modal"
import { NearbyPlaceCard } from "@/components/nearby-place-card"
import { BudgetView } from "@/components/budget/budget-view"


interface WeatherForecast {
    date: string;
    temp: number;
    description: string;
    icon: string;
    pop: number;
}

export default function TripDetailsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const ownerId = searchParams.get('ownerId') || user?.uid || '';

    const [trip, setTrip] = useState<Trip | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [documents, setDocuments] = useState<TravelDocument[]>([]);
    const [selectedDay, setSelectedDay] = useState(1);
    const [days, setDays] = useState<number[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const [forecast, setForecast] = useState<WeatherForecast[]>([]);
    const [expandedPlaces, setExpandedPlaces] = useState<Set<string>>(new Set());
    const [selectedParentForPOI, setSelectedParentForPOI] = useState<string | null>(null);
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; activityId: string | null; hasChildren: boolean }>({ open: false, activityId: null, hasChildren: false });
    const [addPOIDialogOpen, setAddPOIDialogOpen] = useState(false);
    const [selectedPOIPlace, setSelectedPOIPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showRouteVisualizer, setShowRouteVisualizer] = useState(false);
    const [optimizedRouteData, setOptimizedRouteData] = useState<any[]>([]);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');

    const canEdit = userRole === 'owner' || userRole === 'editor';


    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user && id && ownerId) {
            // Fetch Trip Details
            const fetchTrip = async () => {
                try {
                    console.log("🔍 Fetching trip:", { ownerId, tripId: id });
                    const docRef = doc(db, "users", ownerId, "trips", id);
                    console.log("📍 Document path:", `users/${ownerId}/trips/${id}`);

                    const docSnap = await getDoc(docRef);
                    console.log("✅ Document fetched successfully", { exists: docSnap.exists() });

                    if (docSnap.exists()) {
                        const tripData = { id: docSnap.id, ownerId, ...docSnap.data() } as Trip;
                        setTrip(tripData);

                        // Calculate days
                        const start = new Date(tripData.startDate);
                        const end = new Date(tripData.endDate);
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        setDays(Array.from({ length: diffDays }, (_, i) => i + 1));

                        // Fetch Weather
                        if (tripData.destination) {
                            getWeather(tripData.destination).then(setForecast);
                        }
                    } else {
                        console.log("No such trip!");
                        if (ownerId === user.uid) {
                            router.push("/dashboard");
                        }
                    }
                } catch (error: any) {
                    console.error("❌ Error fetching trip:", error);
                    console.error("Error code:", error?.code);
                    console.error("Error message:", error?.message);
                    console.error("Error details:", JSON.stringify(error, null, 2));
                }
            };
            fetchTrip();

            // Subscribe to Itinerary
            const qItinerary = query(collection(db, "users", ownerId, "trips", id, "itinerary"), orderBy("order", "asc"));
            const unsubscribeItinerary = onSnapshot(qItinerary, (snapshot) => {
                const acts: Activity[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    acts.push({
                        id: doc.id,
                        ...data,
                        // Handle legacy data without order
                        order: data.order ?? 0
                    } as Activity);
                });
                // Sort by order, then by createdAt as fallback
                acts.sort((a, b) => {
                    if (a.order !== b.order) return a.order - b.order;
                    return a.createdAt?.seconds - b.createdAt?.seconds;
                });
                setActivities(acts);
            });

            // Subscribe to Documents
            const qDocs = query(collection(db, "users", ownerId, "trips", id, "documents"), orderBy("createdAt", "desc"));
            const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
                const docs: TravelDocument[] = [];
                snapshot.forEach((doc) => {
                    docs.push({ id: doc.id, ...doc.data() } as TravelDocument);
                });
                setDocuments(docs);
            });

            return () => {
                unsubscribeItinerary();
                unsubscribeDocs();
            };
        }
    }, [user, id, router, ownerId]);

    // Determine User Role
    useEffect(() => {
        if (user && trip) {
            if (user.uid === trip.ownerId) {
                setUserRole('owner');
            } else {
                // Listen to participant record
                const unsub = onSnapshot(doc(db, "trips", trip.id, "participants", user.uid), (doc) => {
                    if (doc.exists()) {
                        setUserRole(doc.data().role as 'editor' | 'viewer');
                    } else {
                        setUserRole('viewer');
                    }
                });
                return () => unsub();
            }
        }
    }, [user, trip]);

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedPlace) return;

        const location = {
            lat: selectedPlace.geometry?.location?.lat() || 0,
            lng: selectedPlace.geometry?.location?.lng() || 0,
            name: selectedPlace.name || selectedPlace.formatted_address || "Unknown Place",
        };

        // Calculate new order (last + 1)
        const currentDayActivities = activities.filter(a => a.day === selectedDay);
        const maxOrder = currentDayActivities.length > 0
            ? Math.max(...currentDayActivities.map(a => a.order))
            : -1;

        try {
            await addDoc(collection(db, "users", ownerId, "trips", id, "itinerary"), {
                description: location.name,
                location,
                day: selectedDay,
                order: maxOrder + 1,
                type: 'place',
                createdAt: Timestamp.now(),
            });
            setSelectedPlace(null);
        } catch (error) {
            console.error("Error adding activity:", error);
        }
    };

    const [nearbyAttractions, setNearbyAttractions] = useState<google.maps.places.PlaceResult[]>([]);
    const [nearbyDining, setNearbyDining] = useState<google.maps.places.PlaceResult[]>([]);
    const [nearbyCafes, setNearbyCafes] = useState<google.maps.places.PlaceResult[]>([]);
    const [nearbyShopping, setNearbyShopping] = useState<google.maps.places.PlaceResult[]>([]);
    const [nearbyDialogOpen, setNearbyDialogOpen] = useState(false);
    const [searchingNearby, setSearchingNearby] = useState(false);
    const [activeNearbyTab, setActiveNearbyTab] = useState("attractions");

    const handleNearbySearch = (activity: Activity) => {
        if (!activity.location) return;
        setSelectedParentForPOI(activity.id);
        setNearbyDialogOpen(true);
        setSearchingNearby(true);

        // Reset states
        setNearbyAttractions([]);
        setNearbyDining([]);
        setNearbyCafes([]);
        setNearbyShopping([]);
        setActiveNearbyTab("attractions");

        const service = new google.maps.places.PlacesService(document.createElement('div'));
        const location = new google.maps.LatLng(activity.location.lat, activity.location.lng);
        const radius = 1500; // 1.5km

        const fetchCategory = (type: string): Promise<google.maps.places.PlaceResult[]> => {
            return new Promise((resolve) => {
                const request: google.maps.places.PlaceSearchRequest = {
                    location,
                    radius,
                    type,
                };
                service.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        const filtered = results.filter(p =>
                            (p.rating && p.rating >= 3.5) || (p.user_ratings_total && p.user_ratings_total > 10)
                        );
                        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                        resolve(filtered);
                    } else {
                        resolve([]);
                    }
                });
            });
        };

        Promise.all([
            fetchCategory('tourist_attraction'),
            fetchCategory('restaurant'),
            fetchCategory('cafe'),
            fetchCategory('shopping_mall')
        ]).then(([attractions, dining, cafes, shopping]) => {
            setNearbyAttractions(attractions);
            setNearbyDining(dining);
            setNearbyCafes(cafes);
            setNearbyShopping(shopping);
            setSearchingNearby(false);
        });
    };

    const handleDeleteActivity = async (activityId: string) => {
        if (!user) return;

        // Check if this is a Place with children
        const children = activities.filter(a => a.parentId === activityId);

        if (children.length > 0) {
            setDeleteConfirmDialog({ open: true, activityId, hasChildren: true });
        } else {
            await performDelete(activityId, false);
        }
    };

    const performDelete = async (activityId: string, deleteChildren: boolean) => {
        if (!user) return;

        try {
            if (deleteChildren) {
                // Delete all children first
                const children = activities.filter(a => a.parentId === activityId);
                const deletePromises = children.map(child =>
                    deleteDoc(doc(db, "users", ownerId, "trips", id, "itinerary", child.id))
                );
                await Promise.all(deletePromises);
            }

            // Delete the activity itself
            await deleteDoc(doc(db, "users", ownerId, "trips", id, "itinerary", activityId));

            setDeleteConfirmDialog({ open: false, activityId: null, hasChildren: false });
        } catch (error) {
            console.error("Error deleting activity:", error);
            alert("Failed to delete. Please try again.");
        }
    };

    const handleAddNearbyPlace = async (place: google.maps.places.PlaceResult) => {
        if (!user || !place.geometry?.location || !selectedParentForPOI) return;

        const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.name || "Unknown Place",
        };

        // Get POIs for this parent
        const parentPOIs = activities.filter(a => a.parentId === selectedParentForPOI);
        const maxOrder = parentPOIs.length > 0
            ? Math.max(...parentPOIs.map(a => a.order))
            : -1;

        try {
            await addDoc(collection(db, "users", user.uid, "trips", id, "itinerary"), {
                description: location.name,
                location,
                day: selectedDay,
                order: maxOrder + 1,
                type: 'poi',
                parentId: selectedParentForPOI,
                createdAt: Timestamp.now(),
            });
            setNearbyDialogOpen(false);
        } catch (error) {
            console.error("Error adding nearby place:", error);
        }
    };

    const handleAddManualPOI = async () => {
        if (!user || !selectedPOIPlace || !selectedParentForPOI) return;

        const location = {
            lat: selectedPOIPlace.geometry?.location?.lat() || 0,
            lng: selectedPOIPlace.geometry?.location?.lng() || 0,
            name: selectedPOIPlace.name || selectedPOIPlace.formatted_address || "Unknown POI",
        };

        // Get POIs for this parent
        const parentPOIs = activities.filter(a => a.parentId === selectedParentForPOI);
        const maxOrder = parentPOIs.length > 0
            ? Math.max(...parentPOIs.map(a => a.order))
            : -1;

        try {
            await addDoc(collection(db, "users", user.uid, "trips", id, "itinerary"), {
                description: location.name,
                location,
                day: selectedDay,
                order: maxOrder + 1,
                type: 'poi',
                parentId: selectedParentForPOI,
                createdAt: Timestamp.now(),
            });
            setAddPOIDialogOpen(false);
            setSelectedPOIPlace(null);
        } catch (error) {
            console.error("Error adding manual POI:", error);
        }
    };

    const handleSmartOptimize = async (config: RouteConfig) => {
        console.log('[OPTIMIZE] handleSmartOptimize called with config:', config);

        if (!user) {
            console.error('[OPTIMIZE] No user found');
            return;
        }
        setIsOptimizing(true);

        try {
            let currentDayActivities = activities.filter(a => a.day === selectedDay); // Include all activities (Places + POIs)
            console.log('[OPTIMIZE] Current day activities:', currentDayActivities.length, currentDayActivities.map(a => a.description));

            // 1. Handle Custom Start Point
            if (config.startPoint.type === 'custom' && config.startPoint.customLocation) {
                console.log('[OPTIMIZE] Adding custom start point:', config.startPoint.customLocation.name);
                const docRef = await addDoc(collection(db, "users", ownerId, "trips", id, "itinerary"), {
                    description: config.startPoint.customLocation.name,
                    location: config.startPoint.customLocation,
                    day: selectedDay,
                    order: -1, // Temporary order
                    type: 'place',
                    createdAt: Timestamp.now(),
                });
                // Add to local list for optimization
                currentDayActivities.unshift({
                    id: docRef.id,
                    description: config.startPoint.customLocation.name,
                    location: config.startPoint.customLocation,
                    day: selectedDay,
                    order: -1,
                    createdAt: Timestamp.now()
                } as Activity);
            }

            // 2. Handle Custom End Point
            if (config.endPoint.type === 'custom' && config.endPoint.customLocation) {
                console.log('[OPTIMIZE] Adding custom end point:', config.endPoint.customLocation.name);
                const docRef = await addDoc(collection(db, "users", ownerId, "trips", id, "itinerary"), {
                    description: config.endPoint.customLocation.name,
                    location: config.endPoint.customLocation,
                    day: selectedDay,
                    order: 999, // Temporary order
                    type: 'place',
                    createdAt: Timestamp.now(),
                });
                // Add to local list
                currentDayActivities.push({
                    id: docRef.id,
                    description: config.endPoint.customLocation.name,
                    location: config.endPoint.customLocation,
                    day: selectedDay,
                    order: 999,
                    createdAt: Timestamp.now()
                } as Activity);
            }

            // 3. Prepare locations for API
            // We need to ensure the Start Point is at index 0
            let locationsToOptimize = currentDayActivities.map(a => ({
                lat: a.location?.lat || 0,
                lng: a.location?.lng || 0,
                name: a.description,
                id: a.id,
                parentId: a.parentId
            }));

            // If specific start point selected, move it to front
            if (config.startPoint.type === 'specific_location' && config.startPoint.locationId) {
                const startIndex = locationsToOptimize.findIndex(l => l.id === config.startPoint.locationId);
                if (startIndex > -1) {
                    const [startNode] = locationsToOptimize.splice(startIndex, 1);
                    locationsToOptimize.unshift(startNode);
                    console.log('[OPTIMIZE] Moved specific start location to front:', startNode.name);
                }
            }

            // If specific end point selected, move it to back
            if (config.endPoint.type === 'specific_location' && config.endPoint.locationId) {
                const endIndex = locationsToOptimize.findIndex(l => l.id === config.endPoint.locationId);
                if (endIndex > -1) {
                    const [endNode] = locationsToOptimize.splice(endIndex, 1);
                    locationsToOptimize.push(endNode);
                    console.log('[OPTIMIZE] Moved specific end location to back:', endNode.name);
                }
            }

            console.log('[OPTIMIZE] Calling API with', locationsToOptimize.length, 'locations');
            console.log('[OPTIMIZE] Locations:', locationsToOptimize.map(l => l.name));

            // 4. Call API
            const response = await fetch('/api/optimize-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locations: locationsToOptimize,
                    mode: config.travelMode,
                    config: config  // Pass full config for endpoint handling
                })
            });

            const data = await response.json();
            console.log('[OPTIMIZE] API response:', data);

            if (!response.ok) {
                console.error('[OPTIMIZE] API error:', data.error);
                throw new Error(data.error || 'Optimization failed');
            }

            const optimizedPath = data.optimizedPath as { id: string; name?: string }[];
            console.log('[OPTIMIZE] Optimized path received:', optimizedPath.map((l: any) => l.name));
            console.log('[OPTIMIZE] Optimized count:', optimizedPath.length);

            // Close dialog and stop loading state IMMEDIATELY
            setIsOptimizing(false);
            setOptimizeDialogOpen(false);

            // Show Route Visualization Modal
            setOptimizedRouteData(optimizedPath);
            setShowRouteVisualizer(true);

            // Update Orders in Firestore - Run in background
            const updates = optimizedPath.map((loc, index) => {
                const originalItem = currentDayActivities.find(a => a.id === loc.id);
                if (originalItem) {
                    return updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", loc.id), { order: index });
                }
                return Promise.resolve();
            });

            Promise.all(updates)
                .then(() => console.log('[OPTIMIZE] ✅ All orders updated successfully!'))
                .catch(err => console.error('[OPTIMIZE] ❌ Error updating orders:', err));

        } catch (error) {
            console.error("[OPTIMIZE] Error optimizing route:", error);
            setIsOptimizing(false);
            setOptimizeDialogOpen(false);
            alert(`❌ Failed to optimize route:\n${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleAIOptimize = async (config: RouteConfig) => {
        if (!user) return;
        setIsOptimizing(true);

        try {
            const currentDayActivities = activities.filter(a => a.day === selectedDay);

            // Prepare locations for AI
            const locationsToOptimize = currentDayActivities.map(a => ({
                id: a.id,
                name: a.description,
                // Add more context if available, e.g., type, notes
            }));

            // Call AI API
            const response = await fetch('/api/ai-optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locations: locationsToOptimize,
                    preferences: {
                        travelMode: config.travelMode,
                        startPoint: config.startPoint,
                        endPoint: config.endPoint
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'AI Optimization failed');

            const { optimizedOrder, suggestions } = data;

            // Close dialog and stop loading state IMMEDIATELY
            setIsOptimizing(false);
            setOptimizeDialogOpen(false);

            // Get optimized route data for visualization
            const optimizedRouteData = optimizedOrder
                .map((activityId: string) => {
                    const activity = currentDayActivities.find(a => a.id === activityId);
                    if (!activity) return null;
                    return {
                        id: activity.id,
                        name: activity.description,
                        lat: activity.location?.lat || 0,
                        lng: activity.location?.lng || 0
                    };
                })
                .filter((item: any) => item !== null);

            // Show Route Visualization Modal
            setOptimizedRouteData(optimizedRouteData);
            setShowRouteVisualizer(true);

            // Update Orders in Firestore based on AI result - Run in background
            if (optimizedOrder && Array.isArray(optimizedOrder)) {
                const updates = optimizedOrder.map((activityId: string, index: number) => {
                    return updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", activityId), { order: index });
                });

                // We don't await this for the UI
                Promise.all(updates)
                    .then(() => console.log('[AI-OPTIMIZE] ✅ All orders updated successfully!'))
                    .catch(err => console.error('[AI-OPTIMIZE] ❌ Error updating orders:', err));
            }

        } catch (error) {
            console.error("Error with AI optimization:", error);
            setIsOptimizing(false);
            setOptimizeDialogOpen(false);
            alert(`❌ AI optimization failed:\n${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
        }
    };

    const handleReorder = async (activityId: string, direction: 'up' | 'down') => {
        if (!user) return;

        const activity = activities.find(a => a.id === activityId);
        if (!activity) return;

        console.log('Reordering:', activityId, direction, 'Activity:', activity);

        // Filter activities by same parent context (or no parent for top-level Places)
        // Use strict comparison for parentId (both undefined/null or both same string)
        const siblingActivities = activities
            .filter(a => {
                const sameDay = a.day === selectedDay;
                // Check if both have no parent (undefined or null) or both have same parent
                const sameParent = (!a.parentId && !activity.parentId) ||
                    (a.parentId === activity.parentId);
                return sameDay && sameParent;
            })
            .sort((a, b) => a.order - b.order);

        console.log('Siblings:', siblingActivities.length, siblingActivities.map(s => ({ id: s.id, desc: s.description, order: s.order, parentId: s.parentId })));

        const index = siblingActivities.findIndex(a => a.id === activityId);
        if (index === -1) {
            console.log('Activity not found in siblings!');
            return;
        }


        console.log('Current index:', index, 'Total siblings:', siblingActivities.length);

        if (direction === 'up' && index > 0) {
            const current = siblingActivities[index];
            const prev = siblingActivities[index - 1];

            console.log('Moving up - swapping:', current.description, '(order:', current.order, ') with', prev.description, '(order:', prev.order, ')');

            // Swap orders
            const newOrderCurrent = prev.order;
            const newOrderPrev = current.order;

            console.log('New orders will be:', current.description, '→', newOrderCurrent, ',', prev.description, '→', newOrderPrev);

            try {
                await updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", current.id), { order: newOrderCurrent });
                await updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", prev.id), { order: newOrderPrev });
                console.log('Firestore update complete');
            } catch (err) {
                console.error('Firestore update failed:', err);
            }
        } else if (direction === 'down' && index < siblingActivities.length - 1) {
            const current = siblingActivities[index];
            const next = siblingActivities[index + 1];

            console.log('Moving down - swapping:', current.description, '(order:', current.order, ') with', next.description, '(order:', next.order, ')');

            const newOrderCurrent = next.order;
            const newOrderNext = current.order;

            console.log('New orders will be:', current.description, '→', newOrderCurrent, ',', next.description, '→', newOrderNext);

            try {
                await updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", current.id), { order: newOrderCurrent });
                await updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", next.id), { order: newOrderNext });
                console.log('Firestore update complete');
            } catch (err) {
                console.error('Firestore update failed:', err);
            }
        } else {
            console.log('Move not allowed - at boundary or invalid direction');
        }
    };

    const reindexOrders = async () => {
        if (!user) return;

        console.log('Reindexing orders to fix duplicates...');

        // Get all activities for the selected day
        const dayActivs = activities.filter(a => a.day === selectedDay);

        // Separate Places and POIs
        const places = dayActivs.filter(a => !a.parentId).sort((a, b) => a.order - b.order);

        // Reindex Places starting from 0
        const placeUpdates = places.map((place, index) =>
            updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", place.id), { order: index })
        );

        // Reindex POIs within each Place
        const poiUpdates: Promise<void>[] = [];
        places.forEach(place => {
            const pois = activities.filter(a => a.parentId === place.id).sort((a, b) => a.order - b.order);
            pois.forEach((poi, index) => {
                poiUpdates.push(
                    updateDoc(doc(db, "users", ownerId, "trips", id, "itinerary", poi.id), { order: index })
                );
            });
        });

        try {
            await Promise.all([...placeUpdates, ...poiUpdates]);
            console.log('Reindexing complete! Places:', places.length, 'POIs:', poiUpdates.length);
            alert('Orders have been fixed! Reordering should now work correctly.');
        } catch (error) {
            console.error('Reindexing failed:', error);
        }
    };

    const toggleExpandPlace = (placeId: string) => {
        const newExpanded = new Set(expandedPlaces);
        if (newExpanded.has(placeId)) {
            newExpanded.delete(placeId);
        } else {
            newExpanded.add(placeId);
        }
        setExpandedPlaces(newExpanded);
    };






    if (loading || !trip) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const dayActivities = activities.filter(a => a.day === selectedDay);
    const mapLocations = dayActivities
        .filter(a => a.location)
        .map(a => ({
            lat: a.location!.lat,
            lng: a.location!.lng,
            name: a.location!.name,
            type: a.type as 'place' | 'poi'
        }));

    return (
        <GoogleMapsWrapper>
            <div className="flex flex-col min-h-screen bg-background">
                {/* Header with Back Button */}
                <header className="px-4 h-16 flex items-center border-b sticky top-0 bg-background/95 backdrop-blur z-10">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="mr-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold leading-tight">{trip.name || trip.destination}</h1>
                        <div className="flex flex-col text-xs text-muted-foreground">
                            <span>{trip.startDate} - {trip.endDate}</span>
                            {trip.destinations && trip.destinations.length > 0 && (
                                <span className="opacity-80">{trip.destinations.join(", ")}</span>
                            )}
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {userRole === 'owner' && (
                            <Button variant="outline" size="sm" onClick={() => setShareModalOpen(true)}>
                                <Share className="mr-2 h-4 w-4" /> Share
                            </Button>
                        )}
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6 container mx-auto max-w-5xl">
                    <Tabs defaultValue="itinerary" className="w-full space-y-6">
                        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                            <TabsTrigger value="budget">Budget</TabsTrigger>
                            <TabsTrigger value="docs">Docs</TabsTrigger>
                            <TabsTrigger value="weather">Weather</TabsTrigger>
                        </TabsList>

                        <TabsContent value="budget">
                            {trip && user && <BudgetView trip={trip} userId={user.uid} activities={activities} />}
                        </TabsContent>

                        <TabsContent value="itinerary" className="space-y-6">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {days.map(day => (
                                    <Button
                                        key={day}
                                        variant={selectedDay === day ? "default" : "outline"}
                                        onClick={() => setSelectedDay(day)}
                                        className="whitespace-nowrap"
                                    >
                                        Day {day}
                                    </Button>
                                ))}
                            </div>

                            <div className="grid lg:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle>Day {selectedDay} Activities</CardTitle>
                                            <Dialog open={optimizeDialogOpen} onOpenChange={setOptimizeDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" disabled={!canEdit}>
                                                        <Map className="mr-2 h-4 w-4" /> Optimize Route
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[500px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Optimize Route</DialogTitle>
                                                        <DialogDescription>
                                                            Configure your preferences to optimize the route order.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <RouteSettings
                                                        locations={(() => {
                                                            // Helper to format locations with hierarchy
                                                            const places = dayActivities.filter(a => !a.parentId).sort((a, b) => a.order - b.order);
                                                            const formattedLocations: { id: string; name: string }[] = [];

                                                            places.forEach(place => {
                                                                formattedLocations.push({ id: place.id, name: place.description });
                                                                const pois = dayActivities.filter(a => a.parentId === place.id).sort((a, b) => a.order - b.order);
                                                                pois.forEach(poi => {
                                                                    formattedLocations.push({ id: poi.id, name: `— ${poi.description}` });
                                                                });
                                                            });
                                                            return formattedLocations;
                                                        })()}
                                                        onOptimize={handleSmartOptimize}
                                                        onAIOptimize={handleAIOptimize}
                                                        isOptimizing={isOptimizing}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                {(() => {
                                                    // Get only top-level Places (no parentId) and sort by order
                                                    const places = dayActivities.filter(a => !a.parentId).sort((a, b) => a.order - b.order);

                                                    if (places.length === 0) {
                                                        return <p className="text-muted-foreground text-sm italic">No activities planned for this day.</p>;
                                                    }

                                                    return places.map((place, placeIndex) => {
                                                        // Get POIs for this place
                                                        const pois = activities.filter(a => a.parentId === place.id).sort((a, b) => a.order - b.order);
                                                        const isExpanded = expandedPlaces.has(place.id);

                                                        return (
                                                            <div key={place.id} className="space-y-1">
                                                                {/* Place Card */}
                                                                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 group">
                                                                    {/* Expand/Collapse Icon */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 shrink-0"
                                                                        onClick={() => toggleExpandPlace(place.id)}
                                                                    >
                                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                    </Button>

                                                                    {/* Place Icon */}
                                                                    <MapPin className="h-5 w-5 text-primary shrink-0" />

                                                                    {/* Place Name */}
                                                                    <div className="flex-1">
                                                                        <span className="font-medium">{place.description}</span>
                                                                        {pois.length > 0 && <span className="ml-2 text-xs text-muted-foreground">({pois.length} POI{pois.length > 1 ? 's' : ''})</span>}
                                                                    </div>

                                                                    {/* Place Controls */}
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {place.location && trip && (() => {
                                                                            // Calculate the target date based on trip start date and day number
                                                                            const startDate = new Date(trip.startDate);
                                                                            const targetDate = new Date(startDate);
                                                                            targetDate.setDate(startDate.getDate() + (selectedDay - 1));
                                                                            const targetDateStr = targetDate.toISOString().split('T')[0];

                                                                            return (
                                                                                <WeatherButton
                                                                                    lat={place.location.lat}
                                                                                    lng={place.location.lng}
                                                                                    targetDate={targetDateStr}
                                                                                    placeName={place.description}
                                                                                />
                                                                            );
                                                                        })()}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            onClick={() => handleReorder(place.id, 'up')}
                                                                            disabled={placeIndex === 0 || !canEdit}
                                                                            title="Move Up"
                                                                        >
                                                                            <ChevronUp className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            onClick={() => handleReorder(place.id, 'down')}
                                                                            disabled={placeIndex === places.length - 1 || !canEdit}
                                                                            title="Move Down"
                                                                        >
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            onClick={() => handleNearbySearch(place)}
                                                                            title="Search Nearby POIs"
                                                                        >
                                                                            <MapPin className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            onClick={() => {
                                                                                setSelectedParentForPOI(place.id);
                                                                                setAddPOIDialogOpen(true);
                                                                            }}
                                                                            title="Add POI Manually"
                                                                            disabled={!canEdit}
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                                            onClick={() => handleDeleteActivity(place.id)}
                                                                            title="Delete Place"
                                                                            disabled={!canEdit}
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* POIs (nested, shown when expanded) */}
                                                                {isExpanded && pois.length > 0 && (
                                                                    <div className="ml-8 space-y-1">
                                                                        {pois.map((poi, poiIndex) => (
                                                                            <div key={poi.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 group">
                                                                                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                                                                                <div className="flex-1">
                                                                                    <span className="text-sm">{poi.description}</span>
                                                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 rounded">POI</span>
                                                                                </div>
                                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6"
                                                                                        onClick={() => handleReorder(poi.id, 'up')}
                                                                                        disabled={poiIndex === 0 || !canEdit}
                                                                                        title="Move Up"
                                                                                    >
                                                                                        <ChevronUp className="h-3 w-3" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6"
                                                                                        onClick={() => handleReorder(poi.id, 'down')}
                                                                                        disabled={poiIndex === pois.length - 1 || !canEdit}
                                                                                        title="Move Down"
                                                                                    >
                                                                                        <ChevronDown className="h-3 w-3" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                                                                        onClick={() => handleDeleteActivity(poi.id)}
                                                                                        title="Delete POI"
                                                                                        disabled={!canEdit}
                                                                                    >
                                                                                        <X className="h-3 w-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div className="flex gap-2 mt-4 items-center">
                                                <div className="flex-1">
                                                    <PlacesAutocomplete onPlaceSelect={setSelectedPlace} />
                                                </div>
                                                <Button onClick={handleAddActivity} size="icon" disabled={!selectedPlace || !canEdit}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Dialog open={nearbyDialogOpen} onOpenChange={setNearbyDialogOpen}>
                                        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>Discover Nearby</DialogTitle>
                                                <DialogDescription>
                                                    Find great places near {activities.find(a => a.id === selectedParentForPOI)?.description}
                                                </DialogDescription>
                                            </DialogHeader>

                                            {searchingNearby ? (
                                                <div className="flex-1 flex items-center justify-center">
                                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                    <span className="ml-2">Finding the best spots...</span>
                                                </div>
                                            ) : (
                                                <Tabs value={activeNearbyTab} onValueChange={setActiveNearbyTab} className="flex-1 flex flex-col overflow-hidden">
                                                    <TabsList className="grid w-full grid-cols-4">
                                                        <TabsTrigger value="attractions">Attractions</TabsTrigger>
                                                        <TabsTrigger value="dining">Dining</TabsTrigger>
                                                        <TabsTrigger value="cafes">Cafes</TabsTrigger>
                                                        <TabsTrigger value="shopping">Shopping</TabsTrigger>
                                                    </TabsList>

                                                    <div className="flex-1 overflow-y-auto mt-4 pr-2">
                                                        <TabsContent value="attractions" className="mt-0 space-y-3">
                                                            {nearbyAttractions.length === 0 ? <p className="text-center text-muted-foreground py-8">No attractions found nearby.</p> : nearbyAttractions.map(place => (
                                                                <NearbyPlaceCard key={place.place_id} place={place} onAdd={handleAddNearbyPlace} />
                                                            ))}
                                                        </TabsContent>
                                                        <TabsContent value="dining" className="mt-0 space-y-3">
                                                            {nearbyDining.length === 0 ? <p className="text-center text-muted-foreground py-8">No dining options found nearby.</p> : nearbyDining.map(place => (
                                                                <NearbyPlaceCard key={place.place_id} place={place} onAdd={handleAddNearbyPlace} />
                                                            ))}
                                                        </TabsContent>
                                                        <TabsContent value="cafes" className="mt-0 space-y-3">
                                                            {nearbyCafes.length === 0 ? <p className="text-center text-muted-foreground py-8">No cafes found nearby.</p> : nearbyCafes.map(place => (
                                                                <NearbyPlaceCard key={place.place_id} place={place} onAdd={handleAddNearbyPlace} />
                                                            ))}
                                                        </TabsContent>
                                                        <TabsContent value="shopping" className="mt-0 space-y-3">
                                                            {nearbyShopping.length === 0 ? <p className="text-center text-muted-foreground py-8">No shopping found nearby.</p> : nearbyShopping.map(place => (
                                                                <NearbyPlaceCard key={place.place_id} place={place} onAdd={handleAddNearbyPlace} />
                                                            ))}
                                                        </TabsContent>
                                                    </div>
                                                </Tabs>
                                            )}
                                        </DialogContent>
                                    </Dialog>

                                    {/* Delete Confirmation Dialog  */}
                                    <Dialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({ ...deleteConfirmDialog, open })}>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Confirm Deletion</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                {deleteConfirmDialog.hasChildren ? (
                                                    <>
                                                        <p className="text-sm">
                                                            This Place has{' '}
                                                            <span className="font-semibold">
                                                                {activities.filter(a => a.parentId === deleteConfirmDialog.activityId).length} POI(s)
                                                            </span>{' '}
                                                            nested inside it.
                                                        </p>
                                                        <p className="text-sm text-destructive">
                                                            Deleting this Place will also delete all its POIs. This action cannot be undone.
                                                        </p>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setDeleteConfirmDialog({ open: false, activityId: null, hasChildren: false })}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    if (deleteConfirmDialog.activityId) {
                                                                        performDelete(deleteConfirmDialog.activityId, true);
                                                                    }
                                                                }}
                                                            >
                                                                Delete Place and POIs
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-sm">This should not appear (no children case)</p>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Manual POI Input Dialog */}
                                    <Dialog open={addPOIDialogOpen} onOpenChange={setAddPOIDialogOpen}>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Add POI Manually</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Search for a point of interest to add to this Place.
                                                </p>
                                                <div className="space-y-2">
                                                    <PlacesAutocomplete onPlaceSelect={setSelectedPOIPlace} />
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setAddPOIDialogOpen(false);
                                                            setSelectedPOIPlace(null);
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={handleAddManualPOI}
                                                        disabled={!selectedPOIPlace}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Add POI
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="h-[400px] lg:h-auto rounded-lg overflow-hidden border">
                                    <MapView locations={mapLocations} />
                                </div>
                            </div>
                        </TabsContent>


                        <TabsContent value="docs" className="space-y-6">
                            <TripDocs tripId={id} documents={documents} canEdit={canEdit} />
                        </TabsContent>


                        <TabsContent value="weather" className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                {forecast.length === 0 ? (
                                    <p className="col-span-full text-center text-muted-foreground">Loading forecast...</p>
                                ) : (
                                    forecast.map((day, i) => (
                                        <Card key={i} className="text-center">
                                            <CardHeader className="p-4">
                                                <CardTitle className="text-sm font-medium">{day.date}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0 flex flex-col items-center gap-2">
                                                <img
                                                    src={`http://openweathermap.org/img/wn/${day.icon}@2x.png`}
                                                    alt={day.description}
                                                    className="w-12 h-12"
                                                />
                                                <div className="text-2xl font-bold">{day.temp}°C</div>
                                                <p className="text-xs text-muted-foreground capitalize">{day.description}</p>
                                                {day.pop > 0 && (
                                                    <div className="flex items-center text-xs text-blue-500">
                                                        <CloudRain className="h-3 w-3 mr-1" /> {day.pop}%
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </main>

                {/* Dialogs */}
                <RouteVisualizationModal
                    isOpen={showRouteVisualizer}
                    onClose={() => setShowRouteVisualizer(false)}
                    locations={optimizedRouteData}
                />
            </div>
            {trip && <ShareTripModal open={shareModalOpen} onOpenChange={setShareModalOpen} trip={trip} />}
        </GoogleMapsWrapper>
    );
}
