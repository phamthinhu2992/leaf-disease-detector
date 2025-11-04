import fetch from 'node-fetch';

export interface DailyForecast {
    date: string; // ISO date
    temp: { min: number; max: number; avg: number };
    precipitationProbability: number; // 0..1
    humidity?: number; // 0..1
    windSpeed?: number; // m/s
    description: string;
    confidence: number; // 0..1 how confident the forecast is
}

export interface WeatherForecastResult {
    location: { lat: number; lon: number; name?: string };
    source: string; // 'windy' or 'fallback'
    timezone?: string;
    generatedAt: string;
    daily: DailyForecast[];
}

// Windy API key - use provided key or fallback
const WINDY_KEY = process.env.WINDY_API_KEY || 'D97ndHpW2LKWR487nv50mG3k6swy7gcA';

// Detect location from IP address
export async function detectLocationFromIP(ipAddress?: string): Promise<{ lat: number; lon: number; name?: string }> {
    try {
        const ip = ipAddress || 'auto'; // 'auto' detects client IP
        const url = `https://ip-api.com/json/${ip}`;

        const res = await fetch(url, { timeout: 3000 }) as any;
        if (!res.ok) throw new Error('IP geolocation failed');

        const data = await res.json();
        if (data.status === 'success') {
            return {
                lat: data.lat,
                lon: data.lon,
                name: `${data.city}, ${data.country}` || undefined
            };
        }
        throw new Error('Invalid location response');
    } catch (err) {
        console.warn('IP geolocation failed:', (err as any).message);
        // Default to Vietnam (Hanoi area)
        return { lat: 21.0285, lon: 105.8542, name: 'Hà Nội, Việt Nam' };
    }
}

function isoDateFromTimestamp(ts: number, tzOffsetSeconds?: number) {
    // ts in seconds
    const d = new Date(ts * 1000);
    if (typeof tzOffsetSeconds === 'number') {
        d.setSeconds(d.getSeconds() + tzOffsetSeconds);
    }
    return d.toISOString().slice(0, 10);
}

export async function getWeatherForecast(lat: number, lon: number, days: number = 3): Promise<WeatherForecastResult> {
    try {
        // Use Windy API for weather forecast
        // Try multiple possible endpoints
        const endpoints = [
            // Primary endpoint - Forecast infopoint
            `https://api.windy.com/api/v2/forecast/infopoint?lat=${lat}&lon=${lon}&key=${WINDY_KEY}&model=gfs&parameters=temp,rh,wspd,prec_type`,
            // Alternative endpoint - Direct weather data
            `https://api.windy.com/api/v2/point/forecast?lat=${lat}&lon=${lon}&key=${WINDY_KEY}`
        ];

        console.log(`🌤️ Fetching weather from Windy API for (${lat}, ${lon})...`);

        let lastError = null;
        for (const url of endpoints) {
            try {
                const res = await fetch(url, {
                    timeout: 8000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }) as any;

                if (res.ok) {
                    const json = await res.json();
                    console.log(`✅ Windy API response received`);

                    // Parse Windy response
                    if (json.data && json.data.forecast) {
                        return generateForecastFromWindy(json.data, lat, lon, days);
                    }
                }
            } catch (e) {
                lastError = e;
                console.log(`⚠️ Endpoint failed, trying next...`);
            }
        }

        // If all endpoints fail, use fallback
        console.warn('❌ All Windy API endpoints failed, using fallback:', lastError instanceof Error ? lastError.message : lastError);
        return fallbackForecast(lat, lon, days);

    } catch (err) {
        console.warn('❌ Weather fetch error, using fallback:', (err as any).message || err);
        return fallbackForecast(lat, lon, days);
    }
}

function generateForecastFromWindy(data: any, lat: number, lon: number, days: number): WeatherForecastResult {
    const forecast = data.forecast;
    const daily: DailyForecast[] = [];

    // Group hourly data by day
    const now = new Date();
    const dailyData: { [key: string]: any[] } = {};

    // Process forecast data (temp array has 3-hour intervals)
    const forecastLength = Math.min(days * 8, (forecast.temp || []).length);
    console.log(`📊 Processing ${forecastLength} forecast entries for ${days} days`);

    for (let i = 0; i < forecastLength; i++) {
        const forecastDate = new Date(now.getTime() + i * 3 * 60 * 60 * 1000); // 3-hour steps
        const dateKey = forecastDate.toISOString().slice(0, 10);

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = [];
        }

        dailyData[dateKey].push({
            temp: forecast.temp?.[i] ?? 20,
            rh: forecast.rh?.[i] ?? 50, // relative humidity percentage
            wspd: forecast.wspd?.[i] ?? 5, // wind speed m/s
            prec_type: forecast.prec_type?.[i] ?? 0 // precipitation type
        });
    }

    // Aggregate to daily
    const dateKeys = Object.keys(dailyData).slice(0, days).sort();
    console.log(`📅 Aggregating into ${dateKeys.length} daily forecasts`);

    for (const dateKey of dateKeys) {
        const dayData = dailyData[dateKey];
        if (dayData.length === 0) continue;

        const temps = dayData.map((d: any) => d.temp);
        const humidities = dayData.map((d: any) => d.rh);
        const wspeeds = dayData.map((d: any) => d.wspd);
        const precipTypes = dayData.map((d: any) => d.prec_type);

        const min = Math.min(...temps);
        const max = Math.max(...temps);
        const avg = (min + max) / 2;
        const avgHumidity = humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length / 100;
        const avgWindSpeed = wspeeds.reduce((a: number, b: number) => a + b, 0) / wspeeds.length;
        const precipCount = precipTypes.filter((p: number) => p > 0).length;
        const precipProb = precipCount / dayData.length;

        const descriptions = ['☀️ Nắng', '☁️ Mây', '🌧️ Mưa nhẹ', '🌧️ Mưa', '⛈️ Mưa rào', '⛈️ Bão'];
        const descIdx = Math.min(Math.floor(precipProb * 6), 5);
        const desc = descriptions[descIdx];

        daily.push({
            date: dateKey,
            temp: {
                min: Math.round(min * 10) / 10,
                max: Math.round(max * 10) / 10,
                avg: Math.round(avg * 10) / 10
            },
            humidity: Math.min(1, Math.max(0, avgHumidity)),
            windSpeed: Math.round(avgWindSpeed * 10) / 10,
            precipitationProbability: Math.min(1, Math.max(0, precipProb)),
            description: desc,
            confidence: 0.85
        });
    }

    if (daily.length > 0) {
        console.log(`✅ Successfully generated forecast with ${daily.length} days`);
        return {
            location: { lat, lon },
            source: 'windy',
            timezone: data.timezone || undefined,
            generatedAt: new Date().toISOString(),
            daily
        };
    }

    throw new Error('No daily forecast data generated');
}

function fallbackForecast(lat: number, lon: number, days = 3): WeatherForecastResult {
    // Deterministic pseudo-forecast based on lat/longitude and date
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const baseTemp = 25 - Math.round((Math.abs(lat) / 90) * 15); // rough lat-based temp

    const daily: DailyForecast[] = [];
    for (let i = 0; i < days; i++) {
        const future = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const jitter = ((lat + lon + dayOfYear + i) % 7) - 3; // -3..3
        const min = Math.round((baseTemp - 5 + jitter) * 10) / 10;
        const max = Math.round((baseTemp + 5 + jitter) * 10) / 10;
        const avg = Math.round(((min + max) / 2) * 10) / 10;
        const humidity = Math.round(((Math.abs((lat + lon + i) % 100) / 100) * 0.4 + 0.3) * 100) / 100; // 0.3..0.7
        const windSpeed = Math.round(((Math.abs((lon - lat + i) % 50) / 50) * 8) * 10) / 10; // 0..8 m/s
        const precipitationProbability = Math.round(((Math.abs((lat + lon + i) % 100) / 100) * 0.6) * 100) / 100; // 0..0.6

        const descriptions = ['nắng', 'mây', 'mưa nhẹ', 'mưa', 'mưa rào', 'mưa to'];
        const desc = descriptions[Math.abs(Math.floor((lat + lon + dayOfYear + i) % descriptions.length))];

        daily.push({
            date: future.toISOString().slice(0, 10),
            temp: { min, max, avg },
            humidity,
            windSpeed,
            precipitationProbability,
            description: desc,
            confidence: 0.5 + (0.05 * (3 - i)) // nearer day slightly higher
        });
    }

    return {
        location: { lat, lon },
        source: 'fallback',
        generatedAt: new Date().toISOString(),
        daily
    };
}

export default { getWeatherForecast, detectLocationFromIP };