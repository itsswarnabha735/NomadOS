"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/map-view";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Lightbulb } from "lucide-react";

interface Location {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

interface RouteVisualizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    locations: Location[];
    suggestions?: string;
}

export function RouteVisualizationModal({ isOpen, onClose, locations, suggestions }: RouteVisualizationModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-7xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        Route Optimized Successfully!
                    </DialogTitle>
                    <DialogDescription>
                        Here is your optimized itinerary. The route has been updated automatically.
                    </DialogDescription>
                    {suggestions && (
                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex gap-2 items-start">
                            <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-purple-700 dark:text-purple-300">{suggestions}</p>
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    {/* List View */}
                    <div className="w-full md:w-1/3 border-r bg-muted/10 flex flex-col min-h-0">
                        <div className="p-4 border-b bg-muted/20 font-medium text-sm">
                            {locations.length} Stops
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-3">
                                {locations.map((loc, index) => (
                                    <div key={loc.id || index} className="flex gap-3 items-start group">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-snug break-words">
                                                {loc.name}
                                            </p>
                                            {index < locations.length - 1 && (
                                                <div className="w-0.5 h-4 bg-border ml-3 my-1" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Map View */}
                    <div className="w-full md:w-2/3 h-[300px] md:h-full relative bg-muted/5">
                        <MapView locations={locations} showMarkers={true} showNumbers={true} />
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-background">
                    <Button onClick={onClose} className="w-full md:w-auto">
                        Close & View Itinerary
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
