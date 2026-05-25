import type { Widget } from '../widgets';
import {
  PALETTE,
  clearFrame,
  drawErrorState,
  drawLoadingState,
  drawTag,
} from '../widgets';
import {
  drawBolt,
  drawCloud,
  drawRain,
  drawSnow,
  drawSun,
} from '../widget-icons';
import { loadConfig, saveConfig } from '../widget-config';

interface WeatherConfig {
  /** Optional override; if absent we use browser geolocation. */
  latitude?: number;
  longitude?: number;
  unit?: 'F' | 'C';
  /** Cached location label (city) for display when geolocation succeeds. */
  label?: string;
}

interface WeatherData {
  tempF: number;
  feelsLikeF: number;
  high: number;
  low: number;
  conditionCode: number;
  conditionLabel: string;
  isDay: boolean;
  windMph: number;
  label: string;
  unit: 'F' | 'C';
  fetchedAt: number;
}

const CONFIG_ID = 'weather';

function getConfig(): WeatherConfig {
  return loadConfig<WeatherConfig>(CONFIG_ID) ?? { unit: 'F' };
}

async function resolveCoords(): Promise<{ lat: number; lng: number; label?: string }> {
  const cfg = getConfig();
  if (cfg.latitude !== undefined && cfg.longitude !== undefined) {
    const result: { lat: number; lng: number; label?: string } = {
      lat: cfg.latitude,
      lng: cfg.longitude,
    };
    if (cfg.label !== undefined) result.label = cfg.label;
    return result;
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('GEOLOCATION UNAVAILABLE');
  }
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 1000 * 60 * 30,
    });
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lng}&language=en&format=json`
    );
    if (!r.ok) return undefined;
    const j = (await r.json()) as { results?: { name?: string; admin1?: string }[] };
    const first = j.results?.[0];
    if (!first?.name) return undefined;
    return first.admin1 ? `${first.name}, ${first.admin1}` : first.name;
  } catch {
    return undefined;
  }
}

/** Pretty label for a WMO condition code. */
function conditionForCode(code: number): string {
  if (code === 0) return 'CLEAR';
  if (code <= 3) return 'CLOUDS';
  if (code <= 48) return 'FOG';
  if (code <= 57) return 'DRIZZLE';
  if (code <= 67) return 'RAIN';
  if (code <= 77) return 'SNOW';
  if (code <= 82) return 'SHOWERS';
  if (code <= 86) return 'SNOW';
  if (code <= 99) return 'THUNDER';
  return 'WEATHER';
}

export const WEATHER_WIDGET: Widget<WeatherData> = {
  id: 'weather',
  name: 'Weather',
  description: 'Current conditions for your location. Refreshes every 15 min.',
  intervalSec: 60 * 15,

  async fetchData(): Promise<WeatherData> {
    const { lat, lng, label: cachedLabel } = await resolveCoords();
    const cfg = getConfig();
    const unit = cfg.unit ?? 'F';

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=${unit === 'F' ? 'fahrenheit' : 'celsius'}` +
      `&wind_speed_unit=mph&forecast_days=1&timezone=auto`;

    const r = await fetch(url);
    if (!r.ok) throw new Error(`WEATHER ${r.status}`);
    const j = (await r.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        weather_code: number;
        is_day: 0 | 1;
        wind_speed_10m: number;
      };
      daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
    };

    let label = cachedLabel ?? cfg.label;
    if (!label) {
      label = await reverseGeocode(lat, lng);
      if (label) {
        // Persist label so we skip the geocode roundtrip next time.
        saveConfig<WeatherConfig>(CONFIG_ID, { ...cfg, label });
      }
    }

    return {
      tempF: Math.round(j.current.temperature_2m),
      feelsLikeF: Math.round(j.current.apparent_temperature),
      high: Math.round(j.daily.temperature_2m_max[0] ?? j.current.temperature_2m),
      low: Math.round(j.daily.temperature_2m_min[0] ?? j.current.temperature_2m),
      conditionCode: j.current.weather_code,
      conditionLabel: conditionForCode(j.current.weather_code),
      isDay: j.current.is_day === 1,
      windMph: Math.round(j.current.wind_speed_10m),
      label: (label ?? 'LOCAL').toUpperCase(),
      unit,
      fetchedAt: Date.now(),
    };
  },

  render(ctx, w, h, state) {
    if (state.status === 'loading' || state.status === 'idle') {
      drawLoadingState(ctx, w, h, 'WEATHER…');
      return;
    }
    if (state.status === 'error') {
      drawErrorState(ctx, w, h, 'WEATHER FAULT', state.message);
      return;
    }
    const d = state.data;
    clearFrame(ctx, w, h);

    drawTag(ctx, 'WEATHER', 10, 8);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(d.label.slice(0, 14), w - 10, 8);

    const iconCx = w / 2;
    const iconCy = 64;
    const iconR = 26;
    const iconColor = PALETTE.phosphor;
    const code = d.conditionCode;
    if (code === 0) {
      drawSun(ctx, iconCx, iconCy, iconR, iconColor);
    } else if (code <= 3) {
      drawCloud(ctx, iconCx, iconCy, iconR, iconColor);
    } else if (code <= 67) {
      drawRain(ctx, iconCx, iconCy, iconR, iconColor);
    } else if (code <= 77 || code === 85 || code === 86) {
      drawSnow(ctx, iconCx, iconCy, iconR, iconColor);
    } else if (code >= 95) {
      drawBolt(ctx, iconCx, iconCy, iconR, iconColor);
    } else {
      drawCloud(ctx, iconCx, iconCy, iconR, iconColor);
    }

    // Big temperature with unit suffix
    ctx.fillStyle = PALETTE.phosphor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 60px monospace';
    ctx.fillText(`${d.tempF}°`, w / 2, 140);

    // Condition word
    ctx.fillStyle = PALETTE.white;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(d.conditionLabel, w / 2, 178);

    // High / low strip
    ctx.fillStyle = PALETTE.phosphorDim;
    ctx.fillRect(10, 196, w - 20, 1);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`H ${d.high}°`, 14, 206);
    ctx.textAlign = 'right';
    ctx.fillText(`L ${d.low}°`, w - 14, 206);
    ctx.textAlign = 'center';
    ctx.fillText(`FEELS ${d.feelsLikeF}°`, w / 2, 222);
  },
};

export type { WeatherConfig };
export { CONFIG_ID as WEATHER_CONFIG_ID };
