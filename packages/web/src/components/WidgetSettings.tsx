/**
 * Per-widget configuration panel. Lives inside the Screen view, collapsible
 * so it doesn't crowd the screen controls.
 *
 * Spotify + GitHub use baked-in client IDs (set via VITE_*_CLIENT_ID env vars
 * at build time). Users only have to click Connect, authorize, done.
 *
 * Weather has no per-user config; this panel just exposes the unit toggle.
 */

import { useEffect, useState } from 'react';
import { Panel } from './Panel';
import { Button } from './Button';
import { cn } from '../lib/utils';
import { loadConfig, saveConfig } from '../lib/widget-config';
import {
  WEATHER_CONFIG_ID,
  type WeatherConfig,
} from '../lib/widgets/weather';
import {
  isConnected as spotifyConnected,
  startAuth as startSpotifyAuth,
  clearTokens as clearSpotifyTokens,
} from '../lib/widgets/spotify-oauth';
import {
  isConnected as githubConnected,
  startAuth as startGithubAuth,
  clearTokens as clearGithubTokens,
} from '../lib/widgets/github-oauth';
import { spotifyConfigured, githubConfigured } from '../lib/app-config';

export function WidgetSettings() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const [weatherUnit, setWeatherUnit] = useState<'F' | 'C'>('F');
  const [weatherLabel, setWeatherLabel] = useState<string>('');

  useEffect(() => {
    const w = loadConfig<WeatherConfig>(WEATHER_CONFIG_ID);
    if (w?.unit) setWeatherUnit(w.unit);
    if (w?.label) setWeatherLabel(w.label);
  }, []);

  const spotifyOk = spotifyConnected();
  const githubOk = githubConnected();
  const spotifyReady = spotifyConfigured();
  const githubReady = githubConfigured();

  const handleConnectSpotify = async () => {
    try {
      await startSpotifyAuth();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Spotify connect failed');
    }
  };

  const handleConnectGithub = async () => {
    try {
      await startGithubAuth();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'GitHub connect failed');
    }
  };

  const saveWeather = (next: Partial<WeatherConfig>) => {
    const current = loadConfig<WeatherConfig>(WEATHER_CONFIG_ID) ?? {};
    saveConfig<WeatherConfig>(WEATHER_CONFIG_ID, { ...current, ...next });
  };

  return (
    <Panel padding="lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <div className="text-2xs tracking-widest uppercase text-text-muted">
            WIDGET SETUP
          </div>
          <h3 className="text-base text-text-primary mt-1">
            Connect Spotify and GitHub. Tweak weather.
          </h3>
        </div>
        <span className="text-phosphor text-lg font-mono">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-6 space-y-6">
          {/* Spotify */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xs tracking-widest uppercase text-text-muted">
                SPOTIFY (NOW PLAYING)
              </div>
              <span
                className={cn(
                  'text-2xs tracking-widest uppercase',
                  spotifyOk ? 'text-phosphor' : 'text-text-faint'
                )}
              >
                {spotifyOk ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              Authorizes CONTROL ROOM to read your currently-playing track and
              album art. Tokens stay in your browser. Click Disconnect to revoke
              access locally; full revocation lives in your Spotify account.
            </p>
            {!spotifyReady && (
              <div className="mb-3 px-3 py-2 border border-amber/40 text-2xs tracking-widest uppercase text-amber">
                AWAITING ADMIN CONFIG (VITE_SPOTIFY_CLIENT_ID NOT SET)
              </div>
            )}
            <div className="flex gap-2">
              {spotifyOk ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    clearSpotifyTokens();
                    rerender();
                  }}
                >
                  DISCONNECT SPOTIFY
                </Button>
              ) : (
                <Button onClick={handleConnectSpotify} disabled={!spotifyReady}>
                  CONNECT SPOTIFY
                </Button>
              )}
            </div>
          </div>

          {/* GitHub */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xs tracking-widest uppercase text-text-muted">
                GITHUB NOTIFS
              </div>
              <span
                className={cn(
                  'text-2xs tracking-widest uppercase',
                  githubOk ? 'text-phosphor' : 'text-text-faint'
                )}
              >
                {githubOk ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              Reads your unread notifications via the GitHub API.
              Read-only; nothing is written back. Token stays in your browser.
            </p>
            {!githubReady && (
              <div className="mb-3 px-3 py-2 border border-amber/40 text-2xs tracking-widest uppercase text-amber">
                AWAITING ADMIN CONFIG (VITE_GITHUB_CLIENT_ID NOT SET)
              </div>
            )}
            <div className="flex gap-2">
              {githubOk ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    clearGithubTokens();
                    rerender();
                  }}
                >
                  DISCONNECT GITHUB
                </Button>
              ) : (
                <Button onClick={handleConnectGithub} disabled={!githubReady}>
                  CONNECT GITHUB
                </Button>
              )}
            </div>
          </div>

          {/* Weather */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xs tracking-widest uppercase text-text-muted">
                WEATHER
              </div>
              <span className="text-2xs tracking-widest uppercase text-text-faint">
                {weatherLabel ? `LOC: ${weatherLabel.toUpperCase()}` : 'BROWSER LOC'}
              </span>
            </div>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              Weather pulls from Open-Meteo (no key, no signup). First push asks
              your browser for location.
            </p>
            <div className="flex items-center gap-3">
              <div className="text-2xs tracking-widest uppercase text-text-muted">UNIT</div>
              <div className="inline-flex border border-ink-400">
                {(['F', 'C'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => {
                      setWeatherUnit(u);
                      saveWeather({ unit: u });
                    }}
                    className={cn(
                      'h-9 px-4 text-2xs tracking-widest uppercase border-r border-ink-400 last:border-r-0',
                      weatherUnit === u
                        ? 'text-phosphor bg-phosphor/10'
                        : 'text-text-muted'
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
