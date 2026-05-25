import { cn } from '../lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Padding preset. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Drop shadow elevation. */
  elevation?: 'flat' | 'card' | 'elevated';
}

export function Panel({
  children,
  className,
  style,
  padding = 'md',
  elevation = 'card',
}: PanelProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-7',
  }[padding];

  const shadowClass = {
    flat: '',
    card: 'shadow-card',
    elevated: 'shadow-elevated',
  }[elevation];

  return (
    <div
      className={cn(
        'relative bg-white border border-ink-600 rounded-lg',
        shadowClass,
        paddingClass,
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
