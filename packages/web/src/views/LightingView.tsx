import { useState } from 'react';
import {
  type ND75Device,
  LightingMode,
  LIGHTING_MODE_NAMES,
  DEFAULT_RGB_STATE,
  type RGBState,
} from '@control-room/protocol';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { KeyboardLayout } from '../components/KeyboardLayout';
import { ND75_LAYOUT } from '../lib/nd75-layout';
import { cn, rgbToHex, hexToRgb } from '../lib/utils';

interface LightingViewProps {
  device: ND75Device;
}

export function LightingView({ device }: LightingViewProps) {
  const [state, setState] = useState<RGBState>(DEFAULT_RGB_STATE);
  const [pushing, setPushing] = useState(false);
  const [lastPush, setLastPush] = useState<{ ok: boolean; message: string } | null>(null);

  const update = (changes: Partial<RGBState>) => {
    setState((prev) => ({ ...prev, ...changes }));
  };

  const push = async () => {
    setPushing(true);
    setLastPush(null);
    const start = performance.now();
    try {
      await device.setRGBState(state);
      const elapsed = Math.round(performance.now() - start);
      setLastPush({ ok: true, message: `PUSHED IN ${elapsed}MS` });
    } catch (err) {
      setLastPush({
        ok: false,
        message: err instanceof Error ? err.message.toUpperCase() : 'UNKNOWN ERROR',
      });
    } finally {
      setPushing(false);
    }
  };

  const hex = rgbToHex(state.color);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <SectionHeader
        index="02"
        label="LIGHTING"
        subtitle="Pick a mode and color. Push to write it to the keyboard. The keyboard remembers your last state across reboots."
        action={
          <div className="flex items-center gap-3">
            {lastPush && (
              <span
                className={cn(
                  'text-2xs tracking-widest uppercase',
                  lastPush.ok ? 'text-phosphor' : 'text-danger'
                )}
              >
                {lastPush.message}
              </span>
            )}
            <Button onClick={push} loading={pushing}>
              PUSH TO DEVICE
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
        {/* Keyboard preview with the current color applied across keys for visualization */}
        <Panel padding="lg">
          <div className="text-2xs tracking-widest uppercase text-text-muted mb-4">
            PREVIEW
          </div>
          <KeyboardLayout
            keyColors={
              state.mode === LightingMode.Off
                ? {}
                : Object.fromEntries(
                    ND75_LAYOUT.map((k) => [k.slot, hex])
                  )
            }
          />
          <p className="mt-4 text-2xs tracking-widest uppercase text-text-faint">
            PREVIEW REFLECTS COLOR ONLY. ACTUAL ANIMATION RUNS ON THE KEYBOARD.
          </p>
        </Panel>

        {/* Controls */}
        <div className="space-y-4">
          {/* Mode picker */}
          <Panel padding="md">
            <div className="text-2xs tracking-widest uppercase text-text-muted mb-3">
              MODE
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {LIGHTING_MODE_NAMES.map((name, idx) => {
                const active = state.mode === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => update({ mode: idx as LightingMode })}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-2 text-2xs tracking-widest uppercase border transition-colors',
                      active
                        ? 'border-phosphor bg-phosphor/10 text-phosphor'
                        : 'border-ink-400 text-text-secondary hover:border-text-muted hover:text-text-primary'
                    )}
                  >
                    <span className={active ? 'text-phosphor' : 'text-text-faint'}>
                      {idx.toString().padStart(2, '0')}
                    </span>
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Color */}
          <Panel padding="md">
            <div className="text-2xs tracking-widest uppercase text-text-muted mb-3">
              COLOR
            </div>
            <div className="flex items-center gap-3">
              <label className="relative block w-14 h-14 cursor-pointer border border-ink-400 overflow-hidden">
                <span
                  className="absolute inset-0"
                  style={{ background: hex }}
                />
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => {
                    const rgb = hexToRgb(e.target.value);
                    if (rgb) update({ color: rgb });
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <div className="flex-1">
                <div className="text-text-primary text-sm font-mono">{hex}</div>
                <div className="text-2xs tracking-widest uppercase text-text-faint mt-1">
                  R {state.color.r.toString().padStart(3, '0')} ·
                  G {state.color.g.toString().padStart(3, '0')} ·
                  B {state.color.b.toString().padStart(3, '0')}
                </div>
              </div>
              <label className="flex items-center gap-2 text-2xs tracking-widest uppercase text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.singleColor}
                  onChange={(e) => update({ singleColor: e.target.checked })}
                  className="accent-phosphor"
                />
                SINGLE
              </label>
            </div>
          </Panel>

          {/* Sliders */}
          <Panel padding="md" className="space-y-4">
            <SliderRow
              label="BRIGHTNESS"
              value={state.brightness}
              max={6}
              onChange={(v) => update({ brightness: v })}
            />
            <SliderRow
              label="SPEED"
              value={state.speed}
              max={6}
              onChange={(v) => update({ speed: v })}
            />
            <SliderRow
              label="DIRECTION"
              value={state.direction}
              max={1}
              onChange={(v) => update({ direction: v })}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs tracking-widest uppercase text-text-muted">
          {label}
        </span>
        <span className="text-2xs tracking-widest uppercase text-phosphor font-mono">
          {value}/{max}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max + 1 }).map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={cn(
              'flex-1 h-2 transition-colors',
              i <= value ? 'bg-phosphor' : 'bg-ink-500 hover:bg-ink-400'
            )}
          />
        ))}
      </div>
    </div>
  );
}
