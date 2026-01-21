"use client";

import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PredictionErrorProps {
    message: string;
    onRetry: () => void;
    onDismiss: () => void;
}

export function PredictionError({ message, onRetry, onDismiss }: PredictionErrorProps) {
    return (
        <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="rounded-full bg-destructive/10 p-3">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-destructive">
                            Unable to Generate Predictions
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            {message || "We couldn't generate budget predictions at this time."}
                        </p>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <p>Possible reasons:</p>
                        <ul className="list-disc list-inside mt-1 text-left">
                            <li>No internet connection</li>
                            <li>AI service temporarily unavailable</li>
                        </ul>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Please check your connection and try again.
                    </p>

                    <div className="flex gap-3">
                        <Button onClick={onRetry} variant="default">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                        <Button onClick={onDismiss} variant="outline">
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
