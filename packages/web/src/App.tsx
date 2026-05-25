import { useEffect, useState } from 'react';
import { useDevice } from './hooks/useDevice';
import { ConnectView } from './views/ConnectView';
import { AppHeader, type Tab } from './components/AppHeader';
import { KeymapView } from './views/KeymapView';
import { LightingView } from './views/LightingView';
import { QuickActionsView } from './views/QuickActionsView';
import { ScreenView } from './views/ScreenView';
import { SettingsView } from './views/SettingsView';
import { handleAuthCallback as handleSpotifyCallback } from './lib/widgets/spotify-oauth';
import { handleAuthCallback as handleGithubCallback } from './lib/widgets/github-oauth';

export function App() {
  const { status, device, connect, disconnect } = useDevice();
  const [tab, setTab] = useState<Tab>('lighting');
  const [, setAuthTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const bump = () => mounted && setAuthTick((n) => n + 1);
    handleSpotifyCallback()
      .then((ok) => {
        if (ok) bump();
      })
      .catch((err) => {
        console.error('Spotify auth callback failed:', err);
      });
    handleGithubCallback()
      .then((ok) => {
        if (ok) bump();
      })
      .catch((err) => {
        console.error('GitHub auth callback failed:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (status.state !== 'connected' || !device) {
    return <ConnectView status={status} onConnect={connect} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-950">
      <AppHeader
        status={status}
        activeTab={tab}
        onTabChange={setTab}
        onDisconnect={disconnect}
      />
      <main className="flex-1">
        {tab === 'keymap' && <KeymapView device={device} />}
        {tab === 'lighting' && <LightingView device={device} />}
        {tab === 'actions' && <QuickActionsView device={device} />}
        {tab === 'screen' && <ScreenView device={device} />}
        {tab === 'settings' && <SettingsView device={device} />}
      </main>
      <footer className="border-t border-ink-600 bg-white px-6 py-4 flex items-center justify-between text-xs text-text-muted">
        <span>Control Room · HVW8 Labs</span>
        <span className="text-text-faint font-mono">MIT</span>
      </footer>
    </div>
  );
}
