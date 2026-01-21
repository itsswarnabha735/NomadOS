import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { getTravelTimes } from '@/lib/google-maps';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
    console.log('[AI-OPTIMIZE] API endpoint called');

    if (!GEMINI_API_KEY) {
        console.error('[AI-OPTIMIZE] Missing Gemini API Key');
        return NextResponse.json({ error: 'Gemini API Key not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { locations, preferences } = body;

        console.log('[AI-OPTIMIZE] Received request:', {
            locationCount: locations?.length,
            preferences
        });

        if (!locations || !Array.isArray(locations)) {
            console.error('[AI-OPTIMIZE] Invalid locations:', locations);
            return NextResponse.json({ error: 'Invalid locations data' }, { status: 400 });
        }

        // --- LOGIC ENHANCEMENT: Start/End Point Identification ---
        let fixedStartId: string | undefined;
        let fixedEndId: string | undefined;

        // Identify Start
        if (preferences.startPoint?.type === 'specific_location' && preferences.startPoint.locationId) {
            fixedStartId = preferences.startPoint.locationId;
        } else if (preferences.startPoint?.type === 'first_location' && locations.length > 0) {
            fixedStartId = locations[0].id;
        }

        // Identify End
        if (preferences.endPoint?.type === 'specific_location' && preferences.endPoint.locationId) {
            fixedEndId = preferences.endPoint.locationId;
        } else if (preferences.endPoint?.type === 'last_location' && locations.length > 0) {
            fixedEndId = locations[locations.length - 1].id;
        } else if (preferences.endPoint?.type === 'return_to_start') {
            fixedEndId = fixedStartId; // Circular trip
        }

        console.log('[AI-OPTIMIZE] Fixed Constraints:', { fixedStartId, fixedEndId });

        // Filter out fixed points to get the "Optimizable Middle"
        // Note: If start/end is 'custom' (lat/lng), it's not in the 'locations' array, so we don't need to remove it?
        // Actually, 'custom' start points are just reference points for the first real location.
        // BUT, if the user selected a specific activity as start, we MUST remove it from the sorting pool
        // to prevent duplicate visits or wrong ordering.

        const optimizableLocations = locations.filter((l: any) => {
            if (l.id === fixedStartId) return false;
            if (l.id === fixedEndId) return false;
            return true;
        });

        // 1. Fetch Travel Times (Context Enrichment)
        let distanceContext = "Travel time data unavailable.";
        try {
            // We need matrix for ALL locations to know relationships, even fixed ones.
            const travelTimes = await getTravelTimes(
                locations.map((l: any) => ({ id: l.id, lat: l.lat, lng: l.lng })),
                locations.map((l: any) => ({ id: l.id, lat: l.lat, lng: l.lng })),
                preferences.travelMode || 'driving'
            );

            if (travelTimes.length > 0) {
                // --- LOGIC ENHANCEMENT: K-Nearest Neighbors (KNN) ---
                // Instead of dumping all pairs, show "From A: Closest is B (5m), C (10m)"
                // This builds a sparse graph for the AI.

                const contextLines: string[] = [];
                const locationMap = new Map(locations.map((l: any) => [l.id, l.name]));

                // For each location, find top 3 closest
                for (const loc of locations) {
                    const fromId = loc.id;
                    const neighbors = travelTimes
                        .filter(t => t.fromId === fromId && t.toId !== fromId)
                        .sort((a, b) => a.durationSeconds - b.durationSeconds)
                        .slice(0, 4); // Top 4 closest

                    if (neighbors.length > 0) {
                        const neighborStr = neighbors
                            .map(n => `${locationMap.get(n.toId)} (${Math.ceil(n.durationSeconds / 60)}m)`)
                            .join(', ');
                        contextLines.push(`- From ${loc.name}: Closest are ${neighborStr}`);
                    }
                }
                distanceContext = `Travel Times (KNN Graph - ${preferences.travelMode}):\n${contextLines.join('\n')}`;
            }
        } catch (err) {
            console.error('[AI-OPTIMIZE] Failed to fetch travel times:', err);
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const modeInstructions = {
            driving: "Prioritize minimizing traffic loops and grouping parking locations.",
            walking: "Prioritize scenic logical flows, minimize hills if implied, and keep walking legs reasonable.",
            transit: "Prioritize hubs and minimize number of transfers. Group locations to avoid zig-zagging across the city.",
            bicycling: "Avoid highways, favor flat routes and bike paths."
        };

        const specificInstruction = modeInstructions[preferences.travelMode as keyof typeof modeInstructions] || modeInstructions.driving;

        // START/END Logic in Prompt
        let startInstruction = "Start at the most logical location.";
        let endInstruction = "End at the most logical location.";

        if (fixedStartId) {
            const startName = locations.find((l: any) => l.id === fixedStartId)?.name || "Fixed Start";
            startInstruction = `Start is FIXED at: ${startName} (ID: ${fixedStartId}). Do not include this in the optimized list output, I will prepend it manually.`;
        }
        if (fixedEndId && fixedEndId !== fixedStartId) {
            const endName = locations.find((l: any) => l.id === fixedEndId)?.name || "Fixed End";
            endInstruction = `End is FIXED at: ${endName} (ID: ${fixedEndId}). Do not include this in the optimized list output, I will append it manually.`;
        }

        const prompt = `
            You are an expert travel planner. I have a list of locations to visit.
            
            Goal: Optimize the visitation order of the 'Optimizable Locations' list.
            Travel Mode: ${preferences.travelMode}
            Config: ${specificInstruction}

            Constraints:
            1. ${startInstruction}
            2. ${endInstruction}

            Optimizable Locations (Order these):
            ${optimizableLocations.map((l: any) => `- ${l.name} (ID: ${l.id})`).join('\n')}
            
            Context (Travel Connectivity):
            ${distanceContext}
            
            Instructions:
            1. Analyze connectivity using the provided context.
            2. Produce an order that minimizes total travel time/distance for the *middle* section.
            
            Output strictly valid JSON.
            Structure:
            {
                "optimizedOrder": ["id_of_first_middle_stop", "id_of_second_middle_stop"...],
                "suggestions": "Brief explanation."
            }
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });
        const response = await result.response;
        const text = response.text();

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const rawData = JSON.parse(jsonStr);

        const OptimizationSchema = z.object({
            optimizedOrder: z.array(z.string()),
            suggestions: z.string()
        });

        const parsedData = OptimizationSchema.parse(rawData);

        // --- STITCHING LOGIC ---
        // Final Order = [FixedStart, ...AI_Middle, FixedEnd]
        const finalOrderIds: string[] = [];
        const addedIds = new Set<string>();

        // 1. Add Start
        if (fixedStartId) {
            finalOrderIds.push(fixedStartId);
            addedIds.add(fixedStartId);
        }

        // 2. Add AI Middle (Filtering duplicates just in case AI hallucinated the start/end back in)
        for (const id of parsedData.optimizedOrder) {
            if (!addedIds.has(id)) {
                finalOrderIds.push(id);
                addedIds.add(id);
            }
        }

        // 3. Add Leftovers (Safety Net) - If AI missed any optimizable location, append it
        // Note: We check 'optimizableLocations' + 'fixed' to ensure nothing from original 'locations' input is lost
        for (const loc of locations) {
            if (!addedIds.has(loc.id)) {
                if (loc.id === fixedEndId) continue; // Will be added at end
                console.warn(`[AI-OPTIMIZE] AI missed location: ${loc.name}. Appending.`);
                finalOrderIds.push(loc.id);
                addedIds.add(loc.id);
            }
        }

        // 4. Add End
        if (fixedEndId) {
            // If return_to_start, startId is same as endId. We might want to list it twice? 
            // In NomadOS, usually we don't list the start activity twice unless it's a distinct event.
            // But for routing, returning to start is implied.
            // However, if the user explicitly selected a *different* activity as end, append it.
            if (!addedIds.has(fixedEndId) || fixedEndId !== fixedStartId) {
                finalOrderIds.push(fixedEndId);
                addedIds.add(fixedEndId);
            }
        }

        console.log('[AI-OPTIMIZE] Final Stitch:', finalOrderIds);

        return NextResponse.json({
            optimizedOrder: finalOrderIds,
            suggestions: parsedData.suggestions
        });

    } catch (error) {
        console.error('[AI-OPTIMIZE] Error:', error);
        return NextResponse.json({
            error: 'AI optimization failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
