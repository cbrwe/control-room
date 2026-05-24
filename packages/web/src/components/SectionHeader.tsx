import { cn } from '../lib/utils';

interface SectionHeaderProps {
  index?: string;
  label: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
}

/**
 * The all-caps small-text section labels used everywhere in the UI.
 * Format: "01 // KEYMAP" with optional subtitle and right-aligned action.
 */
export function SectionHeader({
  index,
  label,
  subtitle,
  className,
  action,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        <div className="flex items-baseline gap-3 text-2xs tracking-widest text-text-muted uppercase">
          {index && (
            <>
              <span className="text-phosphor-dim">{index}</span>
              <span className="text-text-faint">//</span>
            </>
          )}
          <span>{label}</span>
        </div>
        {subtitle && (
          <p className="mt-1.5 text-sm text-text-secondary max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
