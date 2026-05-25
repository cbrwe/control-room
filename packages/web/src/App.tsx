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

  // Handle OAuth redirects when the user lands back on the app. Both
  // providers redirect to the same URL with ?code= + ?state=. Each handler
  // checks state and bails if it's not theirs. Runs once on mount; the
  // handlers clear ?code from the URL when they consume it.
  useEffect(() => {
    handleSpotifyCallback().catch((err) => {
      console.error('Spotify auth callback failed:', err);
    });
    handleGithubCallback().catch((err) => {
      console.error('GitHub auth callback failed:', err);
    });
  }, []);

  if (status.state !== 'connected' || !device) {
    return <ConnectView status={status} onConnect={connect} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
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
      <footer className="border-t border-ink-400 px-6 py-4 text-2xs tracking-widest uppercase text-text-muted flex items-center justify-between">
        <span>CONTROL ROOM // BUILT BY HVW8 LABS</span>
        <span className="text-text-faint">MIT LICENSED</span>
      </footer>
    </div>
  );
}
