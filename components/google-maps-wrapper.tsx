"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

export function GoogleMapsWrapper({ children }: { children: React.ReactNode }) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return <div>Google Maps API Key is missing</div>;
    }

    return (
        <APIProvider apiKey={apiKey} version="weekly" libraries={['places']}>
            {children}
        </APIProvider>
    );
}
