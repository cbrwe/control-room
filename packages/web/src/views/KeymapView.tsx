import { useState } from 'react';
import {
  type ND75Device,
  LAYER,
  KEY,
  CONSUMER,
  key,
  consumer,
  type KeyBinding,
} from '@control-room/protocol';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { KeyboardLayout } from '../components/KeyboardLayout';
import { ND75_LAYOUT, type PhysicalKey } from '../lib/nd75-layout';
import { cn } from '../lib/utils';

interface KeymapViewProps {
  device: ND75Device;
}

interface KeyOption {
  label: string;
  group: string;
  build: () => KeyBinding;
}

const KEY_OPTIONS: KeyOption[] = [
  // Letters
  ...Object.entries(KEY)
    .filter(([k]) => /^[A-Z]$/.test(k))
    .map(([k, v]) => ({
      label: k,
      group: 'LETTERS',
      build: () => key(v),
    })),
  // Numbers
  ...['Num1', 'Num2', 'Num3', 'Num4', 'Num5', 'Num6', 'Num7', 'Num8', 'Num9', 'Num0'].map((n, i) => ({
    label: (i + 1) % 10 === 0 ? '0' : `${(i + 1) % 10}`,
    group: 'NUMBERS',
    build: () => key((KEY as never)[n]),
  })),
  // F keys
  ...['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].map((f) => ({
    label: f,
    group: 'FUNCTION',
    build: () => key((KEY as never)[f]),
  })),
  // Modifiers
  { label: 'CTRL', group: 'MODIFIERS', build: () => key(KEY.LeftCtrl) },
  { label: 'SHIFT', group: 'MODIFIERS', build: () => key(KEY.LeftShift) },
  { label: 'ALT', group: 'MODIFIERS', build: () => key(KEY.LeftAlt) },
  { label: 'CMD/WIN', group: 'MODIFIERS', build: () => key(KEY.LeftWin) },
  // Navigation
  { label: 'ESC', group: 'NAV', build: () => key(KEY.Escape) },
  { label: 'TAB', group: 'NAV', build: () => key(KEY.Tab) },
  { label: 'ENTER', group: 'NAV', build: () => key(KEY.Enter) },
  { label: 'SPACE', group: 'NAV', build: () => key(KEY.Space) },
  { label: 'BKSP', group: 'NAV', build: () => key(KEY.Backspace) },
  { label: 'DEL', group: 'NAV', build: () => key(KEY.Delete) },
  { label: 'HOME', group: 'NAV', build: () => key(KEY.Home) },
  { label: 'END', group: 'NAV', build: () => key(KEY.End) },
  { label: 'PGUP', group: 'NAV', build: () => key(KEY.PageUp) },
  { label: 'PGDN', group: 'NAV', build: () => key(KEY.PageDown) },
  { label: '↑', group: 'NAV', build: () => key(KEY.Up) },
  { label: '↓', group: 'NAV', build: () => key(KEY.Down) },
  { label: '←', group: 'NAV', build: () => key(KEY.Left) },
  { label: '→', group: 'NAV', build: () => key(KEY.Right) },
  // Media (this is the gold — Fn+F10/F11/F12 mapped to single keys)
  { label: 'VOL +', group: 'MEDIA', build: () => consumer(CONSUMER.VolumeUp) },
  { label: 'VOL -', group: 'MEDIA', build: () => consumer(CONSUMER.VolumeDown) },
  { label: 'MUTE', group: 'MEDIA', build: () => consumer(CONSUMER.Mute) },
  { label: 'PREV', group: 'MEDIA', build: () => consumer(CONSUMER.PreviousTrack) },
  { label: 'NEXT', group: 'MEDIA', build: () => consumer(CONSUMER.NextTrack) },
  { label: 'STOP', group: 'MEDIA', build: () => consumer(CONSUMER.Stop) },
  // Browser
  { label: 'BACK', group: 'BROWSER', build: () => consumer(CONSUMER.Back) },
  { label: 'FWD', group: 'BROWSER', build: () => consumer(CONSUMER.Forward) },
  { label: 'REFRESH', group: 'BROWSER', build: () => consumer(CONSUMER.Refresh) },
  { label: 'FAV', group: 'BROWSER', build: () => consumer(CONSUMER.Favorites) },
];

export function KeymapView({ device: _device }: KeymapViewProps) {
  const [layer, setLayer] = useState<0 | 1>(LAYER.BASE);
  const [selected, setSelected] = useState<PhysicalKey | null>(null);
  // Local labeled-overrides for visual feedback. Real read/write to come.
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const handleKeyPick = (option: KeyOption) => {
    if (!selected) return;
    setOverrides((prev) => ({ ...prev, [selected.slot]: option.label }));
    setSelected(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <SectionHeader
        index="01"
        label="KEYMAP"
        subtitle="Click any key to remap it. Switch between the base layer and the FN layer with the toggle. Push the whole map to your keyboard when you're ready."
        action={
          <div className="flex items-center gap-2">
            <LayerToggle layer={layer} onChange={setLayer} />
            <Button variant="secondary" size="md">
              READ FROM DEVICE
            </Button>
            <Button size="md" disabled={Object.keys(overrides).length === 0}>
              PUSH MAP
            </Button>
          </div>
        }
      />

      <Panel padding="lg">
        <div className="mb-4 flex items-center justify-between text-2xs tracking-widest uppercase">
          <span className="text-text-muted">
            LAYER <span className="text-phosphor">{layer === 0 ? 'BASE' : 'FN'}</span>
          </span>
          <span className="text-text-muted">
            REMAPPED <span className="text-phosphor">{Object.keys(overrides).length}</span> / {ND75_LAYOUT.length}
          </span>
        </div>
        <KeyboardLayout
          selectedSlot={selected?.slot ?? null}
          labelOverrides={overrides}
          fnLayerActive={layer === LAYER.FN}
          onKeySelect={setSelected}
        />
      </Panel>

      {/* Key picker drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-5xl bg-white rounded-t-xl border-t border-ink-500 max-h-[80vh] overflow-auto shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-ink-600 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-2xs tracking-widest uppercase text-text-muted">
                  REMAP // SLOT {selected.slot.toString().padStart(3, '0')}
                </div>
                <div className="text-lg text-text-primary mt-1">
                  Currently: <span className="text-phosphor">{overrides[selected.slot] ?? selected.label}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                CLOSE
              </Button>
            </div>
            <div className="p-6">
              {Object.entries(groupBy(KEY_OPTIONS, (o) => o.group)).map(([group, opts]) => (
                <div key={group} className="mb-6 last:mb-0">
                  <div className="text-2xs tracking-widest uppercase text-text-muted mb-3">
                    {group}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-1.5">
                    {opts.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleKeyPick(opt)}
                        className="h-10 px-2 border border-ink-400 text-2xs tracking-widest uppercase text-text-secondary hover:border-phosphor hover:text-phosphor hover:bg-phosphor/5 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayerToggle({ layer, onChange }: { layer: 0 | 1; onChange: (l: 0 | 1) => void }) {
  return (
    <div className="inline-flex border border-ink-400">
      {([0, 1] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={cn(
            'h-10 px-4 text-2xs tracking-widest uppercase border-r border-ink-400 last:border-r-0',
            layer === l ? 'text-phosphor bg-phosphor/10' : 'text-text-muted hover:text-text-primary'
          )}
        >
          {l === 0 ? 'BASE' : 'FN'}
        </button>
      ))}
    </div>
  );
}

function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyFn(item);
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}
