import { cn } from '../lib/utils';

type Variant = 'idle' | 'live' | 'warn' | 'error';

interface StatusPillProps {
  variant: Variant;
  label: string;
  blink?: boolean;
  className?: string;
}

/**
 * Small colored telemetry indicator with optional blinking dot.
 * Used for connection status, layer indicators, mode markers, etc.
 */
export function StatusPill({ variant, label, blink = false, className }: StatusPillProps) {
  const variantClass = {
    idle: 'text-text-muted border-text-faint',
    live: 'text-phosphor border-phosphor/40 bg-phosphor/5',
    warn: 'text-amber border-amber/40 bg-amber/5',
    error: 'text-danger border-danger/40 bg-danger/5',
  }[variant];

  const dotClass = {
    idle: 'bg-text-muted',
    live: 'bg-phosphor shadow-[0_0_8px_currentColor]',
    warn: 'bg-amber shadow-[0_0_8px_currentColor]',
    error: 'bg-danger shadow-[0_0_8px_currentColor]',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 border text-2xs tracking-widest uppercase',
        variantClass,
        className
      )}
    >
      <span
        className={cn(
          'block w-1.5 h-1.5',
          dotClass,
          blink && 'animate-pulse-slow'
        )}
      />
      {label}
    </span>
  );
}
