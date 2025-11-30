"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function analyzeDocument(base64Data: string, mimeType: string) {
    console.log(`[Analyze] Starting analysis for ${mimeType}. Data length: ${base64Data.length}`);

    // Timeout helper
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    try {
        // Use the available model from the list
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
      Analyze this travel document. Extract the following fields and return ONLY a valid JSON object:
      {
        "category": "Identity Proofs" | "Travel Tickets" | "Hotel Reservations" | "Experience Bookings" | "Other",
        "type": "Passport" | "Visa" | "Flight" | "Train" | "Bus" | "Hotel" | "Activity" | "Receipt" | "Other",
        "date": "YYYY-MM-DD" (if found, otherwise null),
        "time": "HH:MM" (if found, otherwise null),
        "reference_number": "string" (booking ref, ticket number, etc.),
        "summary": "Short description of the document"
      }
      Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
    `;

        console.log("[Analyze] Generating content with Gemini...");
        const generatePromise = model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            },
        ]);

        const result = await Promise.race([generatePromise, timeout(20000)]) as any;
        const text = result.response.text();
        console.log("[Analyze] Gemini response received");

        // Clean up markdown code blocks
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Error analyzing document:", error);
        // Return a fallback object so the UI doesn't hang
        return {
            category: "Other",
            type: "Other",
            date: null,
            time: null,
            reference_number: "",
            summary: "Uploaded document (Analysis Failed)"
        };
    }
}
