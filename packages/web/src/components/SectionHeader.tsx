import { cn } from '../lib/utils';

interface SectionHeaderProps {
  index?: string;
  label: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
}

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
        <div className="flex items-baseline gap-2 font-mono text-2xs uppercase tracking-widest text-text-muted">
          {index && <span className="text-phosphor-dim">{index}</span>}
          <span>{label}</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary tracking-tight">
          {toTitleLabel(label)}
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-sm text-text-secondary max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function toTitleLabel(label: string): string {
  return label
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
