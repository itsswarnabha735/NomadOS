import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface PlaceCandidate {
    placeId: string;
    name: string;
    rating?: number;
    userRatingsTotal?: number;
    priceLevel?: number;
    vicinity?: string;
    photoUrl?: string;
    types?: string[];
    lat: number;
    lng: number;
}

export interface RecommendedRestaurant extends PlaceCandidate {
    reason: string;
}

export async function getRestaurantRecommendations(
    places: PlaceCandidate[],
    preferences?: string
): Promise<RecommendedRestaurant[]> {
    if (places.length === 0) {
        return [];
    }

    const model: GenerativeModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    });

    const placesDescription = places
        .map(
            (p, i) =>
                `${i + 1}. ${p.name} (Rating: ${p.rating || "N/A"}, Price Level: ${p.priceLevel !== undefined ? "$".repeat(p.priceLevel + 1) : "N/A"
                }, Reviews: ${p.userRatingsTotal || 0}, Types: ${p.types?.slice(0, 3).join(", ") || "N/A"
                })`
        )
        .join("\n");

    const prompt = `You are a local food guide helping a traveler find the best dining options.

Here are the nearby restaurants:
${placesDescription}

${preferences ? `User preferences: ${preferences}` : "No specific preferences provided."}

Select the top 5 restaurants and for each, provide a brief, personalized reason (1-2 sentences) why it would be a good choice. Focus on cuisine type, ambiance, value, or what makes it special.

Respond ONLY with a valid JSON array of objects. Each object must have:
- "index": The 1-based index from the list above
- "reason": A short, engaging reason for the recommendation

Example:
[{"index": 1, "reason": "Perfect for a quick Italian fix with authentic homemade pasta."}, {"index": 3, "reason": "Great for a budget-friendly lunch with local flavors."}]

JSON Response:`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract JSON from the response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("[Gemini] Could not parse JSON from response:", responseText);
            // Fallback: return top 5 with generic reasons
            return places.slice(0, 5).map((p) => ({
                ...p,
                reason: "Highly rated by locals.",
            }));
        }

        const recommendations: { index: number; reason: string }[] = JSON.parse(
            jsonMatch[0]
        );

        // Map recommendations back to places
        const recommended: RecommendedRestaurant[] = recommendations
            .map((rec) => {
                const place = places[rec.index - 1];
                if (!place) return null;
                return {
                    ...place,
                    reason: rec.reason,
                };
            })
            .filter((r): r is RecommendedRestaurant => r !== null);

        return recommended;
    } catch (error) {
        console.error("[Gemini] Error generating recommendations:", error);
        // Fallback: return top 5 by rating with generic reasons
        return places
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 5)
            .map((p) => ({
                ...p,
                reason: "A popular choice in the area.",
            }));
    }
}
