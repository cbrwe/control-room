/**
 * Per-widget configuration panel. Lives inside the Screen view (collapses by
 * default so it doesn't crowd the screen controls).
 *
 * GitHub Notifications: paste a personal access token (notifications scope).
 * Now Playing (Spotify): paste a Spotify app client_id, then click Connect.
 * Weather: no config needed by default; uses browser geolocation.
 */

import { useEffect, useState } from 'react';
import { Panel } from './Panel';
import { Button } from './Button';
import { cn } from '../lib/utils';
import { loadConfig, saveConfig, clearConfig } from '../lib/widget-config';
import {
  GITHUB_CONFIG_ID,
  type GithubConfig,
} from '../lib/widgets/github';
import {
  WEATHER_CONFIG_ID,
  type WeatherConfig,
} from '../lib/widgets/weather';
import {
  getClientId,
  setClientId,
  getRedirectUri,
  startAuth,
  isConnected,
  clearTokens,
} from '../lib/widgets/spotify-oauth';

export function WidgetSettings() {
  const [open, setOpen] = useState(false);

  const [ghToken, setGhToken] = useState('');
  const [ghTokenSaved, setGhTokenSaved] = useState(false);

  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  const [weatherUnit, setWeatherUnit] = useState<'F' | 'C'>('F');
  const [weatherLabel, setWeatherLabel] = useState<string>('');

  // Load existing config on mount.
  useEffect(() => {
    const gh = loadConfig<GithubConfig>(GITHUB_CONFIG_ID);
    if (gh?.token) {
      setGhToken(gh.token);
      setGhTokenSaved(true);
    }
    setSpotifyClientId(getClientId() ?? '');
    setSpotifyConnected(isConnected());
    const w = loadConfig<WeatherConfig>(WEATHER_CONFIG_ID);
    if (w?.unit) setWeatherUnit(w.unit);
    if (w?.label) setWeatherLabel(w.label);
  }, []);

  const saveGhToken = () => {
    if (!ghToken.trim()) {
      clearConfig(GITHUB_CONFIG_ID);
      setGhTokenSaved(false);
      return;
    }
    saveConfig<GithubConfig>(GITHUB_CONFIG_ID, { token: ghToken.trim() });
    setGhTokenSaved(true);
  };

  const saveSpotifyClient = () => {
    if (!spotifyClientId.trim()) return;
    setClientId(spotifyClientId);
  };

  const handleConnectSpotify = async () => {
    saveSpotifyClient();
    await startAuth();
  };

  const disconnectSpotify = () => {
    clearTokens();
    setSpotifyConnected(false);
  };

  const saveWeather = (next: Partial<WeatherConfig>) => {
    const current = loadConfig<WeatherConfig>(WEATHER_CONFIG_ID) ?? {};
    const updated = { ...current, ...next };
    saveConfig<WeatherConfig>(WEATHER_CONFIG_ID, updated);
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
            Account connections and per-widget config
          </h3>
        </div>
        <span className="text-phosphor text-lg font-mono">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-6 space-y-6">
          {/* GitHub */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xs tracking-widest uppercase text-text-muted">
                GITHUB NOTIFS
              </div>
              <span
                className={cn(
                  'text-2xs tracking-widest uppercase',
                  ghTokenSaved ? 'text-phosphor' : 'text-text-faint'
                )}
              >
                {ghTokenSaved ? 'TOKEN SAVED' : 'NO TOKEN'}
              </span>
            </div>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              Generate a token at{' '}
              <span className="text-phosphor font-mono">github.com/settings/tokens</span>{' '}
              with the <span className="text-phosphor">notifications</span> scope.
              Token stays in your browser only.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
                placeholder="ghp_..."
                className="flex-1 h-10 bg-ink-900 border border-ink-400 px-3 text-text-primary font-mono text-sm outline-none focus:border-phosphor"
              />
              <Button onClick={saveGhToken}>SAVE</Button>
            </div>
          </div>

          {/* Spotify */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xs tracking-widest uppercase text-text-muted">
                SPOTIFY (NOW PLAYING)
              </div>
              <span
                className={cn(
                  'text-2xs tracking-widest uppercase',
                  spotifyConnected ? 'text-phosphor' : 'text-text-faint'
                )}
              >
                {spotifyConnected ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>
            <ol className="text-sm text-text-secondary space-y-1.5 mb-3 leading-relaxed">
              <li>
                <span className="text-text-faint">1. </span>
                Open{' '}
                <span className="text-phosphor font-mono">developer.spotify.com/dashboard</span>{' '}
                and create an app.
              </li>
              <li>
                <span className="text-text-faint">2. </span>
                In the app settings, add this as a Redirect URI (exact, with trailing slash if present):
                <div className="mt-1.5 px-2 py-1.5 bg-ink-900 border border-ink-400 text-phosphor text-2xs font-mono break-all select-all">
                  {getRedirectUri()}
                </div>
              </li>
              <li>
                <span className="text-text-faint">3. </span>
                Paste the Client ID below, then hit CONNECT.
              </li>
            </ol>
            <div className="flex gap-2">
              <input
                type="text"
                value={spotifyClientId}
                onChange={(e) => setSpotifyClientId(e.target.value)}
                placeholder="32-char client_id"
                className="flex-1 h-10 bg-ink-900 border border-ink-400 px-3 text-text-primary font-mono text-sm outline-none focus:border-phosphor"
              />
              {spotifyConnected ? (
                <Button variant="danger" onClick={disconnectSpotify}>
                  DISCONNECT
                </Button>
              ) : (
                <Button onClick={handleConnectSpotify} disabled={!spotifyClientId.trim()}>
                  CONNECT
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
