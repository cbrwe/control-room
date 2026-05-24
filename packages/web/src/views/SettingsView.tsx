import { useState } from 'react';
import {
  type ND75Device,
  timeSyncPayload,
  timeSyncPayloadBCD,
  systemModePayload,
  sleepTimerPayload,
  winLockPayload,
  SystemMode,
} from '@control-room/protocol';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { cn } from '../lib/utils';

interface SettingsViewProps {
  device: ND75Device;
}

interface ActionState {
  status: 'idle' | 'pending' | 'ok' | 'error';
  message?: string;
}

export function SettingsView({ device }: SettingsViewProps) {
  const [timeAction, setTimeAction] = useState<ActionState>({ status: 'idle' });
  const [encoding, setEncoding] = useState<'byte' | 'bcd'>('byte');
  const [sysMode, setSysMode] = useState<SystemMode>(SystemMode.Mac);
  const [sleepL1, setSleepL1] = useState(5);
  const [sleepL2, setSleepL2] = useState(30);
  const [winLock, setWinLock] = useState(false);

  const syncTime = async () => {
    setTimeAction({ status: 'pending' });
    try {
      const payload = encoding === 'byte' ? timeSyncPayload() : timeSyncPayloadBCD();
      await device.writeConfig(payload);
      setTimeAction({
        status: 'ok',
        message: `SYNCED ${new Date().toLocaleTimeString()} (${encoding.toUpperCase()})`,
      });
    } catch (err) {
      setTimeAction({
        status: 'error',
        message: err instanceof Error ? err.message : 'unknown error',
      });
    }
  };

  const applySystemMode = async () => {
    try {
      await device.writeConfig(systemModePayload(sysMode));
    } catch (err) {
      console.error(err);
    }
  };

  const applySleepTimer = async () => {
    try {
      await device.writeConfig(sleepTimerPayload(sleepL1, sleepL2));
    } catch (err) {
      console.error(err);
    }
  };

  const applyWinLock = async (locked: boolean) => {
    setWinLock(locked);
    try {
      await device.writeConfig(winLockPayload(locked));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
      <SectionHeader
        index="04"
        label="SETTINGS"
        subtitle="Configuration that the keyboard remembers across reboots. Includes a working time sync — Chilkey's official driver has had this broken since at least mid-2025."
      />

      {/* Time sync — the broken feature we're fixing */}
      <Panel padding="lg">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
              LCD CLOCK SYNC
            </div>
            <h3 className="text-lg text-text-primary">Push current time to the keyboard's LCD</h3>
            <p className="text-sm text-text-secondary mt-2 max-w-xl leading-relaxed">
              The official "Time Correction" button silently fails on the Chilkey driver.
              We're shipping two encodings since the firmware spec isn't published. If
              "BYTE" doesn't update the clock, try "BCD".
            </p>
          </div>
          <StatusPill
            variant={
              timeAction.status === 'pending'
                ? 'warn'
                : timeAction.status === 'ok'
                  ? 'live'
                  : timeAction.status === 'error'
                    ? 'error'
                    : 'idle'
            }
            label={
              timeAction.status === 'idle'
                ? 'READY'
                : timeAction.status === 'pending'
                  ? 'SYNCING'
                  : timeAction.status === 'ok'
                    ? 'OK'
                    : 'FAULT'
            }
            blink={timeAction.status === 'pending'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex border border-ink-400">
            {(['byte', 'bcd'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setEncoding(opt)}
                className={cn(
                  'h-10 px-4 text-2xs tracking-widest uppercase border-r border-ink-400 last:border-r-0',
                  encoding === opt ? 'text-phosphor bg-phosphor/10' : 'text-text-muted'
                )}
              >
                {opt.toUpperCase()}
              </button>
            ))}
          </div>
          <Button onClick={syncTime} loading={timeAction.status === 'pending'}>
            SYNC NOW
          </Button>
          {timeAction.message && (
            <span
              className={cn(
                'text-2xs tracking-widest uppercase',
                timeAction.status === 'ok' ? 'text-phosphor' : 'text-danger'
              )}
            >
              {timeAction.message}
            </span>
          )}
        </div>
      </Panel>

      {/* System mode */}
      <Panel padding="lg">
        <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
          SYSTEM MODE
        </div>
        <h3 className="text-lg text-text-primary mb-1">Keyboard layout target</h3>
        <p className="text-sm text-text-secondary mb-4">
          Replaces the Fn+A (Windows) / Fn+S (Mac) shortcut. Pick the OS you're using.
        </p>
        <div className="flex items-center gap-3">
          <div className="inline-flex border border-ink-400">
            <button
              onClick={() => setSysMode(SystemMode.Mac)}
              className={cn(
                'h-10 px-4 text-2xs tracking-widest uppercase border-r border-ink-400',
                sysMode === SystemMode.Mac ? 'text-phosphor bg-phosphor/10' : 'text-text-muted'
              )}
            >
              MAC
            </button>
            <button
              onClick={() => setSysMode(SystemMode.Windows)}
              className={cn(
                'h-10 px-4 text-2xs tracking-widest uppercase',
                sysMode === SystemMode.Windows ? 'text-phosphor bg-phosphor/10' : 'text-text-muted'
              )}
            >
              WINDOWS
            </button>
          </div>
          <Button variant="secondary" onClick={applySystemMode}>
            APPLY
          </Button>
        </div>
      </Panel>

      {/* Sleep timers */}
      <Panel padding="lg">
        <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
          SLEEP TIMERS
        </div>
        <h3 className="text-lg text-text-primary mb-1">Power-saving thresholds</h3>
        <p className="text-sm text-text-secondary mb-4">
          Backlight goes dark at level 1. Bluetooth disconnects and the keyboard
          enters deep standby at level 2. Defaults are 5 and 30 minutes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <NumberField label="LEVEL 1 // MIN" value={sleepL1} onChange={setSleepL1} max={60} />
          <NumberField label="LEVEL 2 // MIN" value={sleepL2} onChange={setSleepL2} max={240} />
        </div>
        <Button variant="secondary" onClick={applySleepTimer}>APPLY</Button>
      </Panel>

      {/* Win lock */}
      <Panel padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
              WIN KEY LOCK
            </div>
            <h3 className="text-lg text-text-primary">Disable the Windows/Cmd key</h3>
            <p className="text-sm text-text-secondary mt-2 max-w-xl">
              Prevents accidental Start-menu activation while gaming. Replaces the
              Fn+Win combo.
            </p>
          </div>
          <Switch checked={winLock} onChange={applyWinLock} />
        </div>
      </Panel>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div>
      <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
        {label}
      </div>
      <div className="flex items-center border border-ink-400">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-10 w-10 text-text-secondary hover:text-phosphor hover:bg-phosphor/5 border-r border-ink-400"
        >
          –
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value))))}
          className="flex-1 h-10 bg-transparent text-center text-text-primary font-mono outline-none"
        />
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-10 w-10 text-text-secondary hover:text-phosphor hover:bg-phosphor/5 border-l border-ink-400"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-14 h-7 border transition-colors',
        checked ? 'bg-phosphor border-phosphor' : 'bg-transparent border-ink-400'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 transition-transform',
          checked ? 'right-0.5 bg-ink-950' : 'left-0.5 bg-text-secondary'
        )}
      />
    </button>
  );
}
