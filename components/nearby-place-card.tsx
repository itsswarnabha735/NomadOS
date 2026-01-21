import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Plus, Clock, DollarSign } from "lucide-react";

interface NearbyPlaceCardProps {
    place: google.maps.places.PlaceResult;
    onAdd: (place: google.maps.places.PlaceResult) => void;
    added?: boolean;
}

export function NearbyPlaceCard({ place, onAdd, added = false }: NearbyPlaceCardProps) {
    const photoUrl = place.photos && place.photos.length > 0
        ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
        : null;

    const renderPriceLevel = (level?: number) => {
        if (!level) return null;
        return (
            <span className="flex text-xs text-muted-foreground ml-2">
                {Array(level).fill(0).map((_, i) => (
                    <DollarSign key={i} className="h-3 w-3" />
                ))}
            </span>
        );
    };

    const isOpen = place.opening_hours?.isOpen ? place.opening_hours.isOpen() : null;

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row h-full">
                {/* Image Section */}
                <div className="sm:w-32 h-32 sm:h-auto bg-muted shrink-0 relative">
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={place.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <MapPin className="h-8 w-8 opacity-20" />
                        </div>
                    )}
                    {place.rating && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
                            <Star className="h-3 w-3 text-yellow-400 mr-1 fill-yellow-400" />
                            {place.rating}
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <CardContent className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-sm line-clamp-2 leading-tight">{place.name}</h4>
                            {renderPriceLevel(place.price_level)}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1">
                            {place.types?.slice(0, 2).map((type) => (
                                <Badge key={type} variant="secondary" className="text-[10px] px-1 h-5 capitalize">
                                    {type.replace(/_/g, ' ')}
                                </Badge>
                            ))}
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                            {place.vicinity}
                        </div>

                        {isOpen !== null && (
                            <div className={`mt-1 text-xs ${isOpen ? 'text-green-600' : 'text-red-500'} flex items-center`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {isOpen ? 'Open Now' : 'Closed'}
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-end">
                        <Button
                            size="sm"
                            variant={added ? "secondary" : "default"}
                            className="h-8 text-xs"
                            onClick={() => onAdd(place)}
                            disabled={added}
                        >
                            {added ? 'Added' : (
                                <>
                                    <Plus className="h-3 w-3 mr-1" /> Add to Itinerary
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}
