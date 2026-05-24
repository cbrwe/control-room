import { cn } from '../lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Show corner brackets like a viewfinder. */
  brackets?: boolean;
  /** Padding preset. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Bordered container with optional corner brackets (the four L-shaped tick marks
 * at the corners, like a camera viewfinder or radar display frame).
 */
export function Panel({
  children,
  className,
  style,
  brackets = false,
  padding = 'md',
}: PanelProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <div
      className={cn(
        'relative border border-ink-400 bg-ink-800/40 backdrop-blur-sm',
        paddingClass,
        className
      )}
      style={style}
    >
      {brackets && (
        <>
          <Bracket position="tl" />
          <Bracket position="tr" />
          <Bracket position="bl" />
          <Bracket position="br" />
        </>
      )}
      {children}
    </div>
  );
}

function Bracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute w-2.5 h-2.5 pointer-events-none';
  const positionClass = {
    tl: '-top-px -left-px border-l border-t border-phosphor',
    tr: '-top-px -right-px border-r border-t border-phosphor',
    bl: '-bottom-px -left-px border-l border-b border-phosphor',
    br: '-bottom-px -right-px border-r border-b border-phosphor',
  }[position];
  return <span className={cn(base, positionClass)} />;
}
