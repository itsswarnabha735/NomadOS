"use client";

import { useState } from "react";
import { Cloud, Loader2, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getWeatherForLocation } from "@/app/actions/get-weather";

interface WeatherData {
    date: string;
    temp: number;
    description: string;
    icon: string;
    pop: number;
}

interface WeatherButtonProps {
    lat: number;
    lng: number;
    targetDate: string;
    placeName: string;
}

export function WeatherButton({ lat, lng, targetDate, placeName }: WeatherButtonProps) {
    const [open, setOpen] = useState(false);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleClick = async () => {
        setOpen(true);
        if (weather) return; // Already fetched

        setLoading(true);
        setError(false);

        try {
            const data = await getWeatherForLocation(lat, lng, targetDate);
            if (data) {
                setWeather(data);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("Error fetching weather:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClick}
                title="View Weather"
            >
                <Cloud className="h-4 w-4" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Weather for {placeName}</DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="text-center p-8">
                                <p className="text-sm text-muted-foreground">
                                    Weather data not available for this date
                                </p>
                            </div>
                        ) : weather ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                    {new Date(weather.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>

                                <img
                                    src={`http://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                                    alt={weather.description}
                                    className="w-24 h-24"
                                />

                                <div className="text-4xl font-bold">{weather.temp}°C</div>

                                <p className="text-lg capitalize text-muted-foreground">
                                    {weather.description}
                                </p>

                                {weather.pop > 0 && (
                                    <div className="flex items-center gap-2 text-blue-500">
                                        <CloudRain className="h-5 w-5" />
                                        <span className="text-sm font-medium">
                                            {weather.pop}% chance of rain
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
