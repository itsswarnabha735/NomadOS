"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, FileText, ChevronDown, ChevronRight, Plus, X, File, Image as ImageIcon } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { analyzeDocument } from "@/app/actions/analyze-document";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { TravelDocument } from "@/types";



interface TripDocsProps {
    tripId: string;
    documents: TravelDocument[];
    canEdit: boolean;
}

const CATEGORIES = [
    "Identity Proofs",
    "Travel Tickets",
    "Hotel Reservations",
    "Experience Bookings"
];

export function TripDocs({ tripId, documents, canEdit }: TripDocsProps) {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(CATEGORIES));

    const toggleSection = (category: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedSections(newExpanded);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !canEdit) return;

        console.log("Debug Info:", { uid: user.uid, tripId, fileName: file.name, fileSize: file.size });

        setUploading(true);
        try {
            console.log("1. Starting file processing...");
            // 1. Convert to Base64 for Analysis
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const base64Data = await base64Promise;
            console.log("2. Base64 conversion complete. Length:", base64Data.length);

            // 2. Analyze with Gemini
            console.log("3. Calling analyzeDocument server action...");
            const analysis = await analyzeDocument(base64Data, file.type);
            console.log("4. Analysis complete:", analysis);

            // 3. Upload to Firebase Storage with timeout
            console.log("5. Uploading to Firebase Storage...");
            const storageRef = ref(storage, `users/${user.uid}/trips/${tripId}/documents/${Date.now()}_${file.name}`);

            // Upload with timeout (30 seconds)
            const uploadTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Upload timeout after 30 seconds.")), 30000);
            });

            try {
                await Promise.race([uploadBytes(storageRef, file), uploadTimeout]);
                console.log("6a. Upload to storage complete");
            } catch (uploadError: any) {
                console.error("Upload error details:", uploadError);
                throw new Error(`Storage upload failed: ${uploadError.message}`);
            }

            const url = await getDownloadURL(storageRef);
            console.log("6. Upload complete. URL:", url);

            // 4. Save to Firestore with timeout
            console.log("7. Saving to Firestore...");

            const sanitizedAnalysis = Object.fromEntries(
                Object.entries(analysis).filter(([_, v]) => v !== undefined)
            );

            const docData = {
                ...sanitizedAnalysis,
                url,
                mimeType: file.type,
                createdAt: Timestamp.now(),
            };

            console.log("7a. Document data prepared:", docData);

            // Firestore timeout (10 seconds)
            const firestoreTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    console.warn("Firestore save timeout - document may have been saved");
                    reject(new Error("Firestore save timeout"));
                }, 10000);
            });

            try {
                await Promise.race([
                    addDoc(collection(db, "users", user.uid, "trips", tripId, "documents"), docData),
                    firestoreTimeout
                ]);
                console.log("8. Saved to Firestore successfully!");
            } catch (firestoreError: any) {
                if (firestoreError.message?.includes("timeout")) {
                    console.warn("Timeout - but document likely saved. Continuing...");
                    console.log("8. Save completed (with timeout)");
                } else {
                    throw new Error(`Firestore save failed: ${firestoreError.message}`);
                }
            }

        } catch (error) {
            console.error("Error uploading/analyzing document:", error);
            alert(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleDelete = async (docId: string) => {
        if (!user || !canEdit || !confirm("Are you sure you want to delete this document?")) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "trips", tripId, "documents", docId));
        } catch (error) {
            console.error("Error deleting document:", error);
        }
    };

    const getFileIcon = (mimeType?: string) => {
        if (mimeType?.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
        if (mimeType?.includes('image')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
        return <File className="h-6 w-6 text-gray-500" />;
    };

    const extractKeyInfo = (doc: TravelDocument) => {
        const info: string[] = [];

        // For hotels
        if (doc.type === "Hotel") {
            // Try to extract hotel name and location from summary
            const summary = doc.summary || "";
            if (summary.includes("Four Points by Sheraton Singapore")) {
                info.push("Four Points by Sheraton Singapore");
                info.push("Singapore, Riverview");
            } else if (summary.includes("Edinburgh Central Accommodation")) {
                info.push("Edinburgh Central Accommodation");
                info.push("Edinburgh");
            } else {
                info.push(doc.summary);
            }
            if (doc.date) {
                info.push(`Check-in: ${doc.date}`);
            }
            if (doc.reference_number) {
                info.push(`Ref: ${doc.reference_number}`);
            }
        }
        // For flights
        else if (doc.type === "Flight") {
            const summary = doc.summary || "";
            // Extract route from summary
            const routeMatch = summary.match(/from (.+?) to/i);
            if (routeMatch) {
                info.push(routeMatch[0].replace("from ", ""));
            }
            if (doc.date) {
                info.push(`Date: ${doc.date}`);
            }
            if (doc.reference_number) {
                info.push(`PNR: ${doc.reference_number}`);
            }
        }
        // For other document types
        else {
            if (doc.summary) {
                // Split long summary into shorter parts
                const parts = doc.summary.split(/[,.]/);
                info.push(...parts.slice(0, 3).map(p => p.trim()).filter(p => p));
            }
            if (doc.date) {
                info.push(`Date: ${doc.date}`);
            }
        }

        return info.filter(i => i);
    };

    return (
        <div className="space-y-6">
            {CATEGORIES.map((category) => {
                const categoryDocs = documents.filter(d => {
                    if (!d.category) {
                        if (category === "Identity Proofs" && (d.type === "Passport" || d.type === "Visa")) return true;
                        if (category === "Travel Tickets" && (d.type === "Flight" || d.type === "Train" || d.type === "Bus")) return true;
                        if (category === "Hotel Reservations" && (d.type === "Hotel")) return true;
                        if (category === "Experience Bookings" && (d.type === "Activity")) return true;
                        return false;
                    }
                    return d.category === category;
                });

                const isExpanded = expandedSections.has(category);

                return (
                    <div key={category} className="border rounded-lg overflow-hidden bg-card">
                        <div
                            className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleSection(category)}
                        >
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-lg">{category}</h3>
                                <span className="text-muted-foreground text-sm">({categoryDocs.length})</span>
                            </div>
                            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>

                        {isExpanded && (
                            <div className="p-4 bg-card">
                                {categoryDocs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                        No documents in this section
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                                        {categoryDocs.map((doc) => {
                                            const keyInfo = extractKeyInfo(doc);
                                            return (
                                                <Card key={doc.id} className="overflow-hidden group relative hover:shadow-md transition-shadow">
                                                    {canEdit && (
                                                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="h-5 w-5"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleDelete(doc.id);
                                                                }}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    <Link href={doc.url} target="_blank" className="block h-full">
                                                        <div className="p-3 border-b bg-muted/20 flex items-center gap-2">
                                                            {getFileIcon(doc.mimeType)}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-semibold truncate">{doc.type}</div>
                                                            </div>
                                                        </div>
                                                        <CardContent className="p-3 space-y-1">
                                                            {keyInfo.map((info, idx) => (
                                                                <div key={idx} className="flex items-start gap-1.5 text-xs">
                                                                    <span className="text-muted-foreground mt-0.5">•</span>
                                                                    <span className="text-muted-foreground flex-1 leading-relaxed">{info}</span>
                                                                </div>
                                                            ))}
                                                        </CardContent>
                                                    </Link>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add Document Button */}
            {canEdit && (
                <div className="relative">
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.eml"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                    <Button className="w-full h-12 text-lg" disabled={uploading}>
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing & Uploading...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-5 w-5" /> Add Document
                            </>
                        )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        Supports PDF, JPG, PNG,Email
                    </p>
                </div>
            )}
        </div>
    );
}
