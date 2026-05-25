import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';
import type { ConnectionStatus } from '../hooks/useDevice';

export type Tab = 'keymap' | 'lighting' | 'actions' | 'screen' | 'settings';

interface AppHeaderProps {
  status: ConnectionStatus;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onDisconnect: () => void;
}

const TABS: { id: Tab; label: string; index: string }[] = [
  { id: 'keymap', label: 'KEYMAP', index: '01' },
  { id: 'lighting', label: 'LIGHTING', index: '02' },
  { id: 'actions', label: 'ACTIONS', index: '03' },
  { id: 'screen', label: 'SCREEN', index: '04' },
  { id: 'settings', label: 'SETTINGS', index: '05' },
];

export function AppHeader({ status, activeTab, onTabChange, onDisconnect }: AppHeaderProps) {
  const firmware = status.state === 'connected' ? status.firmware.version : '--';

  return (
    <header className="sticky top-0 z-30 border-b border-ink-400 bg-ink-950/80 backdrop-blur-md">
      <div className="px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Logo lockup */}
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-text-primary text-sm font-bold tracking-widest">
              CONTROL ROOM
            </span>
            <span className="text-phosphor text-sm font-bold animate-blink">_</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-2xs tracking-widest uppercase text-text-muted">
            <span className="text-text-faint">//</span>
            <span>CHILKEY ND75</span>
            <span className="text-text-faint">//</span>
            <span className="text-phosphor">FW {firmware}</span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="hidden md:flex items-center -mb-px self-stretch">
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  'relative h-full px-4 flex items-center gap-2 text-2xs tracking-widest uppercase transition-colors',
                  active
                    ? 'text-phosphor'
                    : 'text-text-muted hover:text-text-primary',
                ].join(' ')}
              >
                <span className={active ? 'text-phosphor' : 'text-text-faint'}>
                  {tab.index}
                </span>
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-phosphor shadow-[0_0_8px_currentColor]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <StatusPill
            variant={status.state === 'connected' ? 'live' : 'idle'}
            label={status.state === 'connected' ? 'ONLINE' : 'OFFLINE'}
            blink={status.state === 'connected'}
          />
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            DISCONNECT
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <nav className="md:hidden flex border-t border-ink-400">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={[
                'flex-1 h-12 flex items-center justify-center text-2xs tracking-widest uppercase border-r border-ink-400 last:border-r-0',
                active ? 'text-phosphor bg-phosphor/5' : 'text-text-muted',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
