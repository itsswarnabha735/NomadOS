// scripts/eval-route.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateScenarios, TestScenario } from './benchmark-data';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in environment variables.");
    process.exit(1);
}

// Stats
interface Result {
    scenarioId: string;
    type: string;
    stops: number;
    originalDistance: number;
    optimizedDistance: number;
    improvement: number;
    status: 'PASS' | 'FAIL' | 'REGRESSION';
    durationMs: number;
    error?: string;
}

// Euclidean Distance Helper
function getDist(l1: any, l2: any) {
    const dx = l1.lat - l2.lat;
    const dy = l1.lng - l2.lng;
    return Math.sqrt(dx * dx + dy * dy);
}

function calculatePathDistance(order: string[], locations: any[]) {
    let dist = 0;
    for (let i = 0; i < order.length - 1; i++) {
        const a = locations.find(l => l.id === order[i]);
        const b = locations.find(l => l.id === order[i + 1]);
        if (a && b) dist += getDist(a, b);
    }
    return dist;
}

// Logic to simulate backend 'Context Enrichment' with Euclidean calc
function getEuclideanContext(locations: any[]) {
    const lines = [];
    for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
            const d = getDist(locations[i], locations[j]);
            // Format as "A -> B: X units"
            lines.push(`- ${locations[i].name} -> ${locations[j].name}: ${d.toFixed(1)} units`);
        }
    }
    // Limit context size for massive routes to avoid token limits? 
    // Flash 2.0 has 1M context, we are fine.
    return lines.join('\n');
}

async function optimizeScenario(scenario: TestScenario): Promise<Result> {
    const start = Date.now();

    // Default Order (As generated)
    const originalOrder = scenario.locations.map(l => l.id);
    const originalDist = calculatePathDistance(originalOrder, scenario.locations);

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const context = getEuclideanContext(scenario.locations);

        const prompt = `
            You are a route optimization engine.
            Objective: Visit all locations with minimum total travel distance.
            
            Locations:
            ${scenario.locations.map(l => `- ${l.name} (ID: ${l.id})`).join('\n')}
            
            Distances (Euclidean):
            ${context}
            
            Instructions:
            1. Find the shortest path visiting all nodes.
            2. Start at the first location listed if not specified otherwise.
            
            Output JSON: { "optimizedOrder": ["id", "id"...] }
            Strictly return valid IDs.
        `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const text = result.response.text();
        const json = JSON.parse(text);

        if (!json.optimizedOrder || !Array.isArray(json.optimizedOrder)) {
            throw new Error("Invalid schema");
        }

        const aiDist = calculatePathDistance(json.optimizedOrder, scenario.locations);
        // Improvement %: (Old - New) / Old
        const improvement = originalDist > 0 ? ((originalDist - aiDist) / originalDist) * 100 : 0;

        // Pass if improvement is positive or basically zero (already optimal)
        // Fail if regression > 1%
        let status: 'PASS' | 'FAIL' | 'REGRESSION' = 'PASS';
        if (improvement < -1.0) status = 'REGRESSION';
        // Check completeness
        if (new Set(json.optimizedOrder).size !== scenario.locations.length) status = 'FAIL';

        return {
            scenarioId: scenario.id,
            type: scenario.type,
            stops: scenario.locations.length,
            originalDistance: originalDist,
            optimizedDistance: aiDist,
            improvement,
            status,
            durationMs: Date.now() - start
        };

    } catch (e: any) {
        return {
            scenarioId: scenario.id,
            type: scenario.type,
            stops: scenario.locations.length,
            originalDistance: originalDist,
            optimizedDistance: -1,
            improvement: 0,
            status: 'FAIL',
            durationMs: Date.now() - start,
            error: e.message
        };
    }
}

async function runSuite() {
    console.log("🧩 Generating 50+ Test Scenarios...");
    const scenarios = generateScenarios();
    console.log(`Generated ${scenarios.length} scenarios. Running Benchmark...`);

    const results: Result[] = [];

    for (const [i, scenario] of scenarios.entries()) {
        process.stdout.write(`[${i + 1}/${scenarios.length}] Testing ${scenario.name}... `);
        await new Promise(r => setTimeout(r, 4000)); // 4s delay = 15 RPM
        const res = await optimizeScenario(scenario);
        results.push(res);
        console.log(`${res.status} (${res.improvement.toFixed(1)}% impr)`);
    }

    console.log("\n--- BENCHMARK COMPLETE ---\n");

    // Aggregates
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const regression = results.filter(r => r.status === 'REGRESSION').length;
    const avgImpr = results.reduce((acc, r) => acc + (r.optimizedDistance > -1 ? r.improvement : 0), 0) / results.length;

    console.log(`Total: ${results.length}`);
    console.log(`Pass: ${passed}`);
    console.log(`Fail: ${failed}`);
    console.log(`Regression: ${regression}`);
    console.log(`Avg Improvement: ${avgImpr.toFixed(2)}%`);

    // CSV Output to separate line
    console.log("\nCSV_DATA_START");
    console.log("ID,Type,Stops,OrigDist,OptDist,Impr%,Status,TimeMs");
    results.forEach(r => {
        console.log(`${r.scenarioId},${r.type},${r.stops},${r.originalDistance.toFixed(1)},${r.optimizedDistance.toFixed(1)},${r.improvement.toFixed(1)},${r.status},${r.durationMs}`);
    });
    console.log("CSV_DATA_END");
}

runSuite();
