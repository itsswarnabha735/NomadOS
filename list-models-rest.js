const apiKey = "AIzaSyCeaAqeCRD1QQXjCtxrLdrp80piRRp4XnE";

async function listModels() {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log("Models:", JSON.stringify(data, null, 2));
}

listModels();
