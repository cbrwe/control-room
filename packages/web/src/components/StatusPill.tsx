import { cn } from '../lib/utils';

type Variant = 'idle' | 'live' | 'warn' | 'error';

interface StatusPillProps {
  variant: Variant;
  label: string;
  blink?: boolean;
  className?: string;
}

export function StatusPill({ variant, label, blink = false, className }: StatusPillProps) {
  const variantClass = {
    idle: 'text-text-muted bg-ink-800 border-ink-600',
    live: 'text-phosphor-dim bg-phosphor/10 border-phosphor/20',
    warn: 'text-amber bg-amber/10 border-amber/20',
    error: 'text-danger bg-danger/10 border-danger/20',
  }[variant];

  const dotClass = {
    idle: 'bg-text-faint',
    live: 'bg-phosphor shadow-[0_0_0_3px_rgba(22,163,74,0.18)]',
    warn: 'bg-amber',
    error: 'bg-danger',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 border rounded-full text-xs font-medium tracking-tight',
        variantClass,
        className
      )}
    >
      <span
        className={cn(
          'block w-1.5 h-1.5 rounded-full',
          dotClass,
          blink && 'animate-pulse-soft'
        )}
      />
      {label}
    </span>
  );
}
