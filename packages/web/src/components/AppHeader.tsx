import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';
import type { ConnectionStatus } from '../hooks/useDevice';
import { cn } from '../lib/utils';

export type Tab = 'keymap' | 'lighting' | 'actions' | 'screen' | 'settings';

interface AppHeaderProps {
  status: ConnectionStatus;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onDisconnect: () => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'keymap', label: 'Keymap' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'actions', label: 'Actions' },
  { id: 'screen', label: 'Screen' },
  { id: 'settings', label: 'Settings' },
];

export function AppHeader({ status, activeTab, onTabChange, onDisconnect }: AppHeaderProps) {
  const firmware = status.state === 'connected' ? status.firmware.version : '--';

  return (
    <header className="sticky top-0 z-30 border-b border-ink-600 bg-white/85 backdrop-blur-md">
      <div className="px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-base font-semibold tracking-tight text-text-primary">
              Control Room
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-ink-600 font-mono text-2xs text-text-muted uppercase tracking-widest">
            <span>ND75</span>
            <span className="text-text-faint">·</span>
            <span className="text-phosphor-dim">fw {firmware}</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 bg-ink-800 rounded-full p-1">
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'h-9 px-4 rounded-full text-sm font-medium transition-all',
                  active
                    ? 'bg-white text-text-primary shadow-card'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <StatusPill
            variant={status.state === 'connected' ? 'live' : 'idle'}
            label={status.state === 'connected' ? 'Online' : 'Offline'}
            blink={status.state === 'connected'}
          />
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      <nav className="md:hidden flex border-t border-ink-600 overflow-x-auto">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 min-w-[80px] h-12 flex items-center justify-center text-sm font-medium border-b-2 transition-colors',
                active
                  ? 'border-phosphor text-text-primary'
                  : 'border-transparent text-text-muted'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="28" height="28" rx="8" fill="#16a34a" />
      <path
        d="M7 10h14M7 14h14M7 18h9"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
