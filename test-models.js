const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

// Load API key from environment variable
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("GEMINI_API_KEY not found in environment variables");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const modelResponse = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // The SDK doesn't have a direct listModels method exposed easily on the main class in some versions, 
        // but usually we can try to just run a dummy generation to see if it works, 
        // OR we can use the model manager if available.
        // Actually, checking the docs/types, usually it's not on the client instance directly in the simplified SDK.
        // But let's try to just use a known stable model 'gemini-pro' to check connectivity first, 
        // and then try 'gemini-1.5-flash' again with a simple text prompt.

        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash works:", result.response.text());

    } catch (error) {
        console.error("gemini-1.5-flash failed:", error.message);
    }

    try {
        console.log("Testing gemini-1.5-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-pro works:", result.response.text());
    } catch (error) {
        console.error("gemini-1.5-pro failed:", error.message);
    }

    try {
        console.log("Testing gemini-pro-vision...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        // Vision model needs image, so this might fail with "Add an image" but that confirms model exists
        console.log("gemini-pro-vision exists (if error is about missing image)");
    } catch (error) {
        console.error("gemini-pro-vision failed:", error.message);
    }
}

listModels();
