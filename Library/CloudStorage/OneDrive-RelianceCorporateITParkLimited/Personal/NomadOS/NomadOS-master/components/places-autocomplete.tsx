"use client";

import { useEffect, useState, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";

interface PlacesAutocompleteProps {
    onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

export function PlacesAutocomplete({ onPlaceSelect }: PlacesAutocompleteProps) {
    const places = useMapsLibrary("places");
    const [useNewApi, setUseNewApi] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteInstance = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        if (!places) return;
        console.log("Places Library Loaded:", places);
        // FORCE OLD API FOR STABILITY
        console.log("Forcing usage of Old Places API (Autocomplete class)");
        setUseNewApi(false);
    }, [places]);

    // New API Implementation (Currently unused but kept for reference)
    useEffect(() => {
        if (!useNewApi || !places || !containerRef.current) return;

        const styleId = 'gmp-places-autocomplete-fix';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                gmp-place-autocomplete::part(list) {
                    z-index: 99999 !important;
                    position: fixed !important;
                }
            `;
            document.head.appendChild(style);
        }

        const PlaceAutocompleteElement = (places as any).PlaceAutocompleteElement;
        const element = new PlaceAutocompleteElement();

        element.classList.add("w-full", "h-10", "rounded-md", "border", "border-input", "bg-background", "px-3", "py-2", "text-sm", "ring-offset-background", "file:border-0", "file:bg-transparent", "file:text-sm", "file:font-medium", "placeholder:text-muted-foreground", "focus-visible:outline-none", "focus-visible:ring-2", "focus-visible:ring-ring", "focus-visible:ring-offset-2", "disabled:cursor-not-allowed", "disabled:opacity-50");

        const handlePlaceSelect = async (e: any) => {
            console.log("gmp-placeselect event fired", e);
            try {
                const place = e.place;
                if (!place) return;

                await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'photos'] });

                const placeResult: any = {
                    place_id: place.id,
                    name: place.displayName,
                    formatted_address: place.formattedAddress,
                    geometry: {
                        location: place.location,
                    },
                    photos: place.photos
                };

                if (placeResult.geometry.location && typeof placeResult.geometry.location.lat !== 'function') {
                    if (place.location && typeof google !== 'undefined') {
                        placeResult.geometry.location = new google.maps.LatLng(place.location.lat, place.location.lng);
                    }
                }

                onPlaceSelect(placeResult);
            } catch (error) {
                console.error("Error handling place selection:", error);
            }
        };

        element.addEventListener("gmp-placeselect", handlePlaceSelect);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(element);

        return () => {
            if (element) {
                element.removeEventListener("gmp-placeselect", handlePlaceSelect);
            }
        };
    }, [places, useNewApi, onPlaceSelect]);

    // Old API Implementation (Fallback)
    useEffect(() => {
        if (useNewApi || !places || !inputRef.current) return;

        console.log("Initializing Old Places API Fallback...");

        // Inject global CSS to ensure autocomplete dropdown works in dialogs
        const styleId = 'google-places-autocomplete-fix';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .pac-container {
                    z-index: 99999 !important;
                    pointer-events: auto !important;
                }
                .pac-item {
                    cursor: pointer !important;
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(style);
        }

        const options = {
            fields: ["geometry", "name", "formatted_address", "photos"],
        };

        // Initialize Autocomplete
        const autocomplete = new places.Autocomplete(inputRef.current, options);
        autocompleteInstance.current = autocomplete;

        // Add Listener
        const listener = autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            console.log("Place selected via Autocomplete:", place);

            if (place && place.geometry) {
                onPlaceSelect(place);
                // Clear input after selection
                if (inputRef.current) {
                    inputRef.current.value = "";
                }
            } else {
                console.warn("Place selected but no geometry or invalid place:", place);
            }
        });

        // Fix Z-Index
        const fixZIndex = () => {
            const pacContainers = document.querySelectorAll('.pac-container');
            pacContainers.forEach((container) => {
                (container as HTMLElement).style.zIndex = '99999';
                (container as HTMLElement).style.pointerEvents = 'auto';
            });
        };

        fixZIndex();
        const observer = new MutationObserver(fixZIndex);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            console.log("Cleaning up Autocomplete instance");
            if (listener) {
                google.maps.event.removeListener(listener);
            }
            if (autocompleteInstance.current) {
                google.maps.event.clearInstanceListeners(autocompleteInstance.current);
            }
            observer.disconnect();
            // We don't remove the DOM elements (.pac-container) as Google Maps manages them, 
            // but clearing listeners is important.
        };
    }, [places, useNewApi, onPlaceSelect]); // Re-run if onPlaceSelect changes to ensure we call the latest one

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Only handle Enter if we want to support custom text entry when NO suggestion is selected.
        // Google Maps Autocomplete handles Enter for suggestion selection automatically.
        // We need to be careful not to override that.

        if (e.key === 'Enter') {
            // We disable custom entry on Enter for now to avoid conflicting with dropdown selection.
            // If the user wants to select from dropdown, they should use arrows + Enter or Click.
            // If they want to add a custom place, they can use the "Add Manual POI" dialog or we can add a specific button.

            e.preventDefault();
            console.log("Enter pressed in Autocomplete Input");
        }
    };

    if (useNewApi) {
        return <div ref={containerRef} className="w-full" />;
    }

    return (
        <Input
            ref={inputRef}
            placeholder="Search for a place..."
            className="w-full"
            onKeyDown={handleKeyDown}
        />
    );
}
