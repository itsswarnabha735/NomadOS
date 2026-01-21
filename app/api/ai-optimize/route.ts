import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

        console.log('[AI-OPTIMIZE] Calling Gemini API...');
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `
            You are an expert travel planner. I have a list of locations I want to visit today.
            Please optimize the route for me, considering logical flow, efficiency, and any constraints implied by the location names (e.g., "Dinner" should be late).
            
            Locations:
            ${locations.map((l: any) => `- ${l.name} (ID: ${l.id})`).join('\n')}
            
            Preferences: ${JSON.stringify(preferences || {})}
            
            Output strictly valid JSON. Do not include markdown formatting (like \`\`\`json).
            Structure:
            {
                "optimizedOrder": ["id1", "id2", "id3"],
                "suggestions": "Brief explanation of why this route is better and any tips (max 2 sentences)."
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('[AI-OPTIMIZE] Gemini response received');

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        console.log('[AI-OPTIMIZE] Optimization complete. Suggested order:', data.optimizedOrder);
        console.log('[AI-OPTIMIZE] AI Suggestions:', data.suggestions);

        return NextResponse.json(data);

    } catch (error) {
        console.error('[AI-OPTIMIZE] Error:', error);
        return NextResponse.json({
            error: 'AI optimization failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
