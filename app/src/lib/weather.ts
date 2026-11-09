import { useQuery } from '@tanstack/react-query'

import type { IconName } from '@/components/ui/icon'

import type { Coords } from './location'
import { queryKeys } from './query-client'

/**
 * Current weather for the Home weather chip.
 *
 * Provider: Open-Meteo (no API key, no user data sent besides rounded coordinates).
 * TODO(Davi): Open-Meteo's free tier is for non-commercial use. Before the public launch either take
 * an Open-Meteo API plan (only the base URL changes) or switch provider. The chip simply hides if the
 * request fails, so the Home never depends on it.
 */
const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

export type Weather = { temperatureC: number; label: string; icon: IconName }

/** WMO weather interpretation codes -> Spanish label + icon. */
export function describeWeatherCode(code: number, isDay: boolean): Pick<Weather, 'label' | 'icon'> {
  if (code === 0) return { label: 'Despejado', icon: isDay ? 'sunny-outline' : 'moon-outline' }
  if (code <= 2) return { label: 'Parcial', icon: isDay ? 'partly-sunny-outline' : 'cloudy-night-outline' }
  if (code === 3) return { label: 'Nublado', icon: 'cloud-outline' }
  if (code === 45 || code === 48) return { label: 'Neblina', icon: 'cloud-outline' }
  if (code >= 51 && code <= 67) return { label: 'Lluvia', icon: 'rainy-outline' }
  if (code >= 71 && code <= 77) return { label: 'Nieve', icon: 'snow-outline' }
  if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: 'rainy-outline' }
  if (code >= 85 && code <= 86) return { label: 'Nieve', icon: 'snow-outline' }
  if (code >= 95) return { label: 'Tormenta', icon: 'thunderstorm-outline' }
  return { label: 'Clima', icon: 'partly-sunny-outline' }
}

async function fetchWeather({ lat, lng }: Coords, signal: AbortSignal): Promise<Weather> {
  const url =
    `${BASE_URL}?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}` +
    '&current=temperature_2m,weather_code,is_day&timezone=America%2FSantiago'
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`weather ${res.status}`)
  const json = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; is_day?: number }
  }
  const c = json.current
  if (c?.temperature_2m == null || c.weather_code == null) throw new Error('weather: bad payload')
  return {
    temperatureC: Math.round(c.temperature_2m),
    ...describeWeatherCode(c.weather_code, c.is_day !== 0),
  }
}

export function useWeather(coords: Coords | undefined) {
  return useQuery({
    queryKey: queryKeys.weather(coords ? `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}` : ''),
    queryFn: ({ signal }) => fetchWeather(coords as Coords, signal),
    enabled: coords != null,
    staleTime: 30 * 60_000,
    retry: false,
  })
}
