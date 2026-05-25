/**
 * Weather widget settings. Spotify and GitHub auth live inline on each widget
 * card in ScreenView; this panel is now just unit toggles for Weather.
 */

import { useEffect, useState } from 'react';
import { Panel } from './Panel';
import { cn } from '../lib/utils';
import { loadConfig, saveConfig } from '../lib/widget-config';
import { WEATHER_CONFIG_ID, type WeatherConfig } from '../lib/widgets/weather';

export function WidgetSettings() {
  const [weatherUnit, setWeatherUnit] = useState<'F' | 'C'>('F');
  const [weatherLabel, setWeatherLabel] = useState<string>('');

  useEffect(() => {
    const w = loadConfig<WeatherConfig>(WEATHER_CONFIG_ID);
    if (w?.unit) setWeatherUnit(w.unit);
    if (w?.label) setWeatherLabel(w.label);
  }, []);

  const saveWeather = (next: Partial<WeatherConfig>) => {
    const current = loadConfig<WeatherConfig>(WEATHER_CONFIG_ID) ?? {};
    saveConfig<WeatherConfig>(WEATHER_CONFIG_ID, { ...current, ...next });
  };

  return (
    <Panel padding="lg">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Weather settings</h3>
          <p className="text-sm text-text-secondary mt-0.5">
            Pulled from Open-Meteo. First push asks your browser for location.
          </p>
        </div>
        <span className="text-xs text-text-muted font-mono">
          {weatherLabel ? `loc · ${weatherLabel}` : 'browser loc'}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <span className="text-xs font-medium text-text-muted">Unit</span>
        <div className="inline-flex bg-ink-800 rounded-full p-1">
          {(['F', 'C'] as const).map((u) => (
            <button
              key={u}
              onClick={() => {
                setWeatherUnit(u);
                saveWeather({ unit: u });
              }}
              className={cn(
                'h-8 px-4 text-xs font-medium rounded-full transition-colors',
                weatherUnit === u
                  ? 'bg-white text-text-primary shadow-card'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
