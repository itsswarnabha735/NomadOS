"use client";

import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

interface Location {
    lat: number;
    lng: number;
    name: string;
    type?: 'place' | 'poi';
}

interface MapViewProps {
    locations: Location[];
    center?: { lat: number; lng: number };
    showMarkers?: boolean;
}

export function MapView({ locations, center, showMarkers = true }: MapViewProps) {
    const map = useMap();
    const routesLibrary = useMapsLibrary("routes");
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
    const [routes, setRoutes] = useState<google.maps.DirectionsResult[]>([]);

    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map, suppressMarkers: true }));
    }, [routesLibrary, map]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer || locations.length < 2) {
            if (directionsRenderer) directionsRenderer.setDirections({ routes: [] } as any);
            return;
        }

        const origin = locations[0];
        const destination = locations[locations.length - 1];
        const waypoints = locations.slice(1, -1).map(loc => ({
            location: { lat: loc.lat, lng: loc.lng },
            stopover: true
        }));

        directionsService.route({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
        }).then(response => {
            directionsRenderer.setDirections(response);
        }).catch(e => console.error("Directions request failed", e));

    }, [directionsService, directionsRenderer, locations]);

    const defaultCenter = { lat: 48.8566, lng: 2.3522 }; // Paris

    return (
        <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden">
            <Map
                defaultZoom={12}
                defaultCenter={center || defaultCenter}
                mapId="DEMO_MAP_ID"
                className="w-full h-full"
            >
                {showMarkers && locations.map((loc, index) => {
                    // Default to yellow for places, blue for POIs
                    const bgColor = loc.type === 'poi' ? "#4285F4" : "#FBBC04";
                    const glyphColor = loc.type === 'poi' ? "#FFF" : "#000";

                    return (
                        <AdvancedMarker key={index} position={{ lat: loc.lat, lng: loc.lng }} title={loc.name}>
                            <Pin background={bgColor} glyphColor={glyphColor} borderColor={"#000"} />
                        </AdvancedMarker>
                    );
                })}
            </Map>
        </div>
    );
}
