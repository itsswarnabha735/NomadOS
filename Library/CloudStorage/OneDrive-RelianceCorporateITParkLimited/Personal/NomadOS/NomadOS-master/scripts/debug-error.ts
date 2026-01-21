// scripts/debug-error.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found");
    process.exit(1);
}

// Failing Scenario: Random Scatter 1 (4 stops)
const count = 4;
// Seeded random for reproducibility (mock)
// Random 1 logic from benchmark-data.ts:
// const size = Math.floor(Math.random() * 8) + 4; -> This varies every run! 
// Ah! The benchmark generator uses Math.random() without a seed. 
// So "Random 1" is different every time. 
// That explains why some fail and some pass if it's content-dependent?
// Or maybe it's just stochastic API failure?
// Let's just try to reproduce *any* 4-stop random request.

const locations = [
    { id: "R1_0", name: "Random 0", lat: 10, lng: 10 },
    { id: "R1_1", name: "Random 1", lat: 12, lng: 8 },
    { id: "R1_2", name: "Random 2", lat: 9, lng: 11 },
    { id: "R1_3", name: "Random 3", lat: 11, lng: 9 }
];

function getDist(l1: any, l2: any) {
    const dx = l1.lat - l2.lat;
    const dy = l1.lng - l2.lng;
    return Math.sqrt(dx * dx + dy * dy);
}

function getEuclideanContext(locations: any[]) {
    const lines = [];
    for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
            const d = getDist(locations[i], locations[j]);
            lines.push(`- ${locations[i].name} -> ${locations[j].name}: ${d.toFixed(1)} units`);
        }
    }
    return lines.join('\n');
}

async function debugRun() {
    console.log(`🔍 Debugging Circular Route with ${count} stops...`);

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const context = getEuclideanContext(locations);
        console.log(`Context Length: ${context.length} characters`);

        const prompt = `
            You are a route optimization engine.
            Objective: Visit all locations with minimum total travel distance.
            
            Locations:
            ${locations.map(l => `- ${l.name} (ID: ${l.id})`).join('\n')}
            
            Distances (Euclidean):
            ${context}
            
            Instructions:
            1. Find the shortest path visiting all nodes.
            2. Start at the first location listed if not specified otherwise.
            
            Output JSON: { "optimizedOrder": ["id", "id"...] }
            Strictly return valid IDs.
        `;

        console.log("🚀 Sending request...");
        const start = Date.now();

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = await result.response;
        console.log("✅ Request completed in", Date.now() - start, "ms");
        console.log("Response text:", response.text());

    } catch (e: any) {
        console.error("❌ ERROR CAUGHT:");
        console.error(e);

        if (e.response) {
            console.error("Response Details:", JSON.stringify(e.response, null, 2));
        }
    }
}

debugRun();
