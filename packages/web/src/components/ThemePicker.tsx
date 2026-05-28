/**
 * Color theme picker for the canvas widgets. Shows a grid of curated swatches
 * (no color wheel by design) grouped by family, plus an Invert toggle that
 * flips background and ink. Each swatch is a tiny faux-LCD preview rendered in
 * that theme's colors; animated themes cycle their ink in the swatch.
 */

import { Panel } from './Panel';
import { cn } from '../lib/utils';
import {
  WIDGET_THEMES,
  THEME_GROUPS,
  invertTheme,
  type WidgetTheme,
} from '../lib/widget-themes';

interface ThemePickerProps {
  value: string;
  inverted: boolean;
  onSelect: (id: string) => void;
  onToggleInvert: () => void;
}

export function ThemePicker({ value, inverted, onSelect, onToggleInvert }: ThemePickerProps) {
  return (
    <Panel padding="lg">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Theme</h3>
          <p className="text-sm text-text-secondary mt-0.5">
            Colors for the clock, text and weather faces. Push once to apply to the keyboard.
          </p>
        </div>
        <button
          onClick={onToggleInvert}
          aria-pressed={inverted}
          className={cn(
            'h-8 px-3 text-xs font-medium rounded-full border transition-colors shrink-0',
            inverted
              ? 'bg-text-primary text-white border-text-primary'
              : 'bg-white text-text-muted border-ink-500 hover:text-text-primary'
          )}
        >
          {inverted ? 'Inverted' : 'Invert'}
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {THEME_GROUPS.map((group) => {
          const themes = WIDGET_THEMES.filter((t) => t.group === group);
          if (themes.length === 0) return null;
          return (
            <div key={group}>
              <div className="text-2xs font-medium uppercase tracking-widest text-text-faint mb-2">
                {group}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {themes.map((t) => (
                  <Swatch
                    key={t.id}
                    theme={t}
                    inverted={inverted}
                    selected={t.id === value}
                    onClick={() => onSelect(t.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

interface SwatchProps {
  theme: WidgetTheme;
  inverted: boolean;
  selected: boolean;
  onClick: () => void;
}

function Swatch({ theme, inverted, selected, onClick }: SwatchProps) {
  const colors = inverted ? invertTheme(theme).colors : theme.colors;
  const animated = Boolean(theme.animate);
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      title={theme.name}
      className={cn(
        'group rounded-md border p-1.5 text-left transition-all',
        selected
          ? 'border-phosphor ring-2 ring-phosphor/30 shadow-card'
          : 'border-ink-500 hover:border-ink-300'
      )}
    >
      <div
        className="h-14 rounded flex flex-col items-center justify-center gap-1 overflow-hidden"
        style={{ background: colors.bg }}
      >
        <span
          className={cn('font-mono text-sm font-bold leading-none', animated && 'cr-hue')}
          style={{ color: colors.fg }}
        >
          12:34
        </span>
        <span
          className="block h-[3px] w-7 rounded-full"
          style={{ background: colors.accent }}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <span className="text-2xs font-medium text-text-secondary truncate">{theme.name}</span>
        {animated && <span className="text-2xs text-phosphor-dim shrink-0">●</span>}
      </div>
    </button>
  );
}
