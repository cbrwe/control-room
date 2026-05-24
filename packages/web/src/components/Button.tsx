import { forwardRef } from 'react';
import { cn } from '../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }, ref) => {
    const baseClasses =
      'group relative inline-flex items-center justify-center gap-2 font-mono uppercase tracking-widest border transition-[background,border-color,color] duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClass = {
      sm: 'h-8 px-3 text-2xs',
      md: 'h-10 px-5 text-xs',
      lg: 'h-12 px-6 text-sm',
    }[size];

    const variantClass = {
      primary:
        'bg-phosphor text-ink-950 border-phosphor hover:bg-phosphor-bright hover:border-phosphor-bright active:bg-phosphor-dim',
      secondary:
        'bg-transparent text-phosphor border-phosphor/40 hover:border-phosphor hover:bg-phosphor/5',
      ghost:
        'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-ink-700',
      danger:
        'bg-transparent text-danger border-danger/40 hover:border-danger hover:bg-danger/5',
    }[variant];

    return (
      <button
        ref={ref}
        className={cn(baseClasses, sizeClass, variantClass, className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        )}
        <span className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {icon}
          {children}
        </span>
      </button>
    );
  }
);
Button.displayName = 'Button';
