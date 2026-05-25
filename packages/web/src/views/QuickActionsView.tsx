import { useMemo, useState } from 'react';
import {
  type ND75Device,
  CONSUMER,
  LAYER,
  consumer,
  type KeyBinding,
} from '@control-room/protocol';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { ND75_LAYOUT } from '../lib/nd75-layout';
import { defaultBaseKeymap, keymapWithOverrides } from '../lib/preset-keymap';
import { cn } from '../lib/utils';

interface QuickActionsViewProps {
  device: ND75Device;
}

interface Action {
  id: string;
  label: string;
  description: string;
  binding: KeyBinding;
}

const ACTIONS: Action[] = [
  { id: 'vol_up', label: 'VOLUME UP', description: 'System volume +', binding: consumer(CONSUMER.VolumeUp) },
  { id: 'vol_dn', label: 'VOLUME DOWN', description: 'System volume -', binding: consumer(CONSUMER.VolumeDown) },
  { id: 'mute', label: 'MUTE', description: 'Toggle system mute', binding: consumer(CONSUMER.Mute) },
  { id: 'play', label: 'PLAY / PAUSE', description: 'Media play/pause toggle', binding: consumer(CONSUMER.PlayPause) },
  { id: 'next', label: 'NEXT TRACK', description: 'Skip forward', binding: consumer(CONSUMER.NextTrack) },
  { id: 'prev', label: 'PREV TRACK', description: 'Skip back', binding: consumer(CONSUMER.PreviousTrack) },
  { id: 'calc', label: 'CALCULATOR', description: 'Launch calculator', binding: consumer(CONSUMER.Calculator) },
  { id: 'mail', label: 'MAIL', description: 'Launch default email client', binding: consumer(CONSUMER.Mail) },
  { id: 'browser', label: 'BROWSER HOME', description: 'Open browser home page', binding: consumer(CONSUMER.BrowserHome) },
  { id: 'search', label: 'SEARCH', description: 'Open system search', binding: consumer(CONSUMER.Search) },
];

// Keys that are reasonable rebind targets — not the ones the user types every minute.
const TARGET_KEYS = ['INS', 'DEL', 'PGUP', 'PGDN', 'F9', 'F10', 'F11', 'F12'];

interface PushState {
  status: 'idle' | 'pushing' | 'ok' | 'error';
  message?: string;
}

export function QuickActionsView({ device }: QuickActionsViewProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [push, setPush] = useState<PushState>({ status: 'idle' });

  const targets = useMemo(
    () => ND75_LAYOUT.filter((k) => TARGET_KEYS.includes(k.label)),
    []
  );

  // Inverse map: which action is bound to each target slot (for conflict detection).
  const slotInUse = useMemo(() => {
    const m = new Map<number, string>();
    for (const [actionId, slotStr] of Object.entries(assignments)) {
      if (!slotStr) continue;
      const slot = Number(slotStr);
      m.set(slot, actionId);
    }
    return m;
  }, [assignments]);

  const setAction = (actionId: string, slotStr: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (!slotStr) {
        delete next[actionId];
      } else {
        // Remove this slot from any other action.
        for (const id of Object.keys(next)) {
          if (next[id] === slotStr && id !== actionId) delete next[id];
        }
        next[actionId] = slotStr;
      }
      return next;
    });
  };

  const apply = async () => {
    const overrides = new Map<number, KeyBinding>();
    for (const [actionId, slotStr] of Object.entries(assignments)) {
      if (!slotStr) continue;
      const action = ACTIONS.find((a) => a.id === actionId);
      if (!action) continue;
      overrides.set(Number(slotStr), action.binding);
    }
    if (overrides.size === 0) {
      setPush({ status: 'error', message: 'NOTHING TO APPLY' });
      return;
    }
    setPush({ status: 'pushing' });
    try {
      await device.writeKeymap(LAYER.BASE, keymapWithOverrides(overrides));
      setPush({
        status: 'ok',
        message: `APPLIED ${overrides.size} BINDING${overrides.size === 1 ? '' : 'S'}`,
      });
    } catch (err) {
      setPush({
        status: 'error',
        message: err instanceof Error ? err.message.toUpperCase() : 'UNKNOWN ERROR',
      });
    }
  };

  const restore = async () => {
    setPush({ status: 'pushing' });
    try {
      await device.writeKeymap(LAYER.BASE, defaultBaseKeymap());
      setAssignments({});
      setPush({ status: 'ok', message: 'RESTORED ND75 DEFAULTS' });
    } catch (err) {
      setPush({
        status: 'error',
        message: err instanceof Error ? err.message.toUpperCase() : 'UNKNOWN ERROR',
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl">
      <SectionHeader
        index="03"
        label="QUICK ACTIONS"
        subtitle="Bind common system shortcuts to physical keys in one click. Pick the function, pick the key, hit APPLY. Changes are written to the base layer and persist on the keyboard."
        action={
          <div className="flex items-center gap-3">
            {push.message && (
              <span
                className={cn(
                  'text-2xs tracking-widest uppercase',
                  push.status === 'ok' ? 'text-phosphor' : 'text-danger'
                )}
              >
                {push.message}
              </span>
            )}
            <StatusPill
              variant={
                push.status === 'pushing'
                  ? 'warn'
                  : push.status === 'ok'
                    ? 'live'
                    : push.status === 'error'
                      ? 'error'
                      : 'idle'
              }
              label={
                push.status === 'idle'
                  ? 'READY'
                  : push.status === 'pushing'
                    ? 'WRITING'
                    : push.status === 'ok'
                      ? 'OK'
                      : 'FAULT'
              }
              blink={push.status === 'pushing'}
            />
            <Button onClick={apply} loading={push.status === 'pushing'}>
              APPLY
            </Button>
          </div>
        }
      />

      <Panel padding="lg">
        <div className="text-2xs tracking-widest uppercase text-text-muted mb-4">
          BINDINGS
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ACTIONS.map((action) => {
            const value = assignments[action.id] ?? '';
            return (
              <div
                key={action.id}
                className="flex items-center gap-3 border border-ink-400 px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-2xs tracking-widest uppercase text-text-primary">
                    {action.label}
                  </div>
                  <div className="text-2xs text-text-faint mt-0.5 truncate">
                    {action.description}
                  </div>
                </div>
                <select
                  value={value}
                  onChange={(e) => setAction(action.id, e.target.value)}
                  className={cn(
                    'h-9 bg-white border rounded-md text-xs px-2.5 font-mono outline-none cursor-pointer',
                    value
                      ? 'border-phosphor text-phosphor-dim font-medium'
                      : 'border-ink-500 text-text-muted hover:border-ink-300'
                  )}
                >
                  <option value="">— UNBOUND —</option>
                  {targets.map((t) => {
                    const otherActionId = slotInUse.get(t.slot);
                    const otherAction =
                      otherActionId && otherActionId !== action.id
                        ? ACTIONS.find((a) => a.id === otherActionId)
                        : null;
                    return (
                      <option key={t.slot} value={String(t.slot)}>
                        {t.label}
                        {otherAction ? ` (used by ${otherAction.label})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
              RESTORE
            </div>
            <h3 className="text-lg text-text-primary">Reset to ND75 factory bindings</h3>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">
              Writes the stock base-layer keymap back to the keyboard. Use this
              if a remap broke something or you want to start over. FN-layer
              bindings are not touched.
            </p>
          </div>
          <Button variant="danger" onClick={restore}>
            RESTORE DEFAULTS
          </Button>
        </div>
      </Panel>

      <Panel padding="lg">
        <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
          CONNECTION MODE
        </div>
        <h3 className="text-lg text-text-primary">Keyboard remembers your last mode</h3>
        <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">
          Set the connection mode once on the keyboard and it stays there. Across
          reboots, across moving to another machine. There's no "ON ONCE" vs
          "ON ALWAYS" toggle to set: the firmware always persists whatever mode
          was last active. If you want your ND75 to always wake into Bluetooth,
          switch to BT once and that becomes the default.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ModeRef label="USB WIRED" combo="Fn + T" note="Required to use this app" />
          <ModeRef label="BLUETOOTH" combo="Fn + Q / W / E" note="Slots 1/2/3, hold 3s to pair" />
          <ModeRef label="2.4G DONGLE" combo="Fn + R" note="Hold 3s to pair" />
        </div>
        <p className="text-2xs tracking-widest uppercase text-text-faint mt-4">
          NOTE: COMBOS FROM THE ND75 MANUAL. VERIFY ON YOUR DEVICE.
        </p>
        <p className="text-2xs tracking-widest uppercase text-text-faint mt-2">
          WHY NOT IN SOFTWARE: THE OFFICIAL DRIVER USES 14 HID OPCODES.
          NONE ARE FOR CONNECTION-MODE PERSISTENCE. ALL ND75 RADIO
          SWITCHING IS DONE BY THE FIRMWARE FROM THE ON-DEVICE Fn KEYS.
        </p>
      </Panel>
    </div>
  );
}

function ModeRef({ label, combo, note }: { label: string; combo: string; note: string }) {
  return (
    <div className="border border-ink-400 p-3">
      <div className="text-2xs tracking-widest uppercase text-text-muted mb-1">
        {label}
      </div>
      <div className="text-sm text-phosphor font-mono">{combo}</div>
      <div className="text-2xs text-text-faint mt-1">{note}</div>
    </div>
  );
}
