/* eslint-disable antfu/no-top-level-await */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { z } from 'zod'

const mcpServer = new McpServer({
  name: 'weather-server',
  version: '0.0.1',
})

mcpServer.tool('get-weather', 'Get current weather for a location with English name', { location: z.string().describe('City name') }, (args) => {
  return getWeather(args.location).then((weather) => {
    return {
      content: [
        { type: 'text', text: `Current weather in ${args.location}:` },
        { type: 'text', text: `Temperature: ${weather.temperature}°C` },
        { type: 'text', text: `Feels like: ${weather.feelsLike}°C` },
        { type: 'text', text: `Humidity: ${weather.humidity}%` },
        { type: 'text', text: `WindSpeed: ${weather.windSpeed}km/h` },
        { type: 'text', text: `WindGust: ${weather.windGust}km/h` },
        { type: 'text', text: `Conditions: ${weather.conditions}` },
      ],
    }
  })
})

// reference: https://github.com/mastra-ai/mastra/blob/main/examples/weather-agent/src/mastra/tools/index.ts
interface WeatherResponse {
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    wind_speed_10m: number
    wind_gusts_10m: number
    weather_code: number
  }
}

async function getWeather(location: string) {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
  const geocodingResponse = await fetch(geocodingUrl)
  const geocodingData = await geocodingResponse.json()

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`)
  }

  const { latitude, longitude, name } = geocodingData.results[0]

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`

  const response = await fetch(weatherUrl)
  const data: WeatherResponse = await response.json()

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  }
}

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  }
  return conditions[code] || 'Unknown'
}

const transport = new StdioServerTransport()
await mcpServer.connect(transport)
