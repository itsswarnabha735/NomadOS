"use server";

export async function getWeather(query: string) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new Error("OpenWeather API Key is missing");
    }

    try {
        // 1. Geocode the city name
        const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData || geoData.length === 0) {
            return [];
        }

        const { lat, lon } = geoData[0];

        // 2. Fetch Forecast
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

        if (!res.ok) {
            throw new Error(`Weather API error: ${res.statusText}`);
        }
        const data = await res.json();

        // Filter to get one forecast per day (e.g., noon)
        const dailyForecasts = data.list.filter((item: any) => item.dt_txt.includes("12:00:00"));

        return dailyForecasts.slice(0, 5).map((item: any) => ({
            date: item.dt_txt.split(" ")[0],
            temp: Math.round(item.main.temp),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            pop: Math.round(item.pop * 100), // Probability of precipitation
        }));
    } catch (error) {
        console.error("Error fetching weather:", error);
        return [];
    }
}

export async function getWeatherForLocation(lat: number, lng: number, targetDate: string) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new Error("OpenWeather API Key is missing");
    }

    try {
        // Fetch Forecast for the specific coordinates
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

        if (!res.ok) {
            throw new Error(`Weather API error: ${res.statusText}`);
        }
        const data = await res.json();

        // Filter to find the forecast closest to the target date
        const target = new Date(targetDate);
        const targetDateStr = target.toISOString().split('T')[0]; // YYYY-MM-DD

        // Find all forecasts for the target date
        const targetForecasts = data.list.filter((item: any) => {
            const forecastDate = item.dt_txt.split(' ')[0];
            return forecastDate === targetDateStr;
        });

        if (targetForecasts.length === 0) {
            // If no exact match, return null
            return null;
        }

        // Prefer the noon forecast, or the first available
        const noonForecast = targetForecasts.find((item: any) => item.dt_txt.includes('12:00:00'));
        const forecast = noonForecast || targetForecasts[0];

        return {
            date: forecast.dt_txt.split(" ")[0],
            temp: Math.round(forecast.main.temp),
            description: forecast.weather[0].description,
            icon: forecast.weather[0].icon,
            pop: Math.round(forecast.pop * 100), // Probability of precipitation
        };
    } catch (error) {
        console.error("Error fetching weather for location:", error);
        return null;
    }
}
