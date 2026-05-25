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
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      icon,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    const baseClasses =
      'group relative inline-flex items-center justify-center gap-2 font-medium rounded-md border transition-[background,border-color,color,box-shadow] duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:shadow-ring';

    const sizeClass = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    }[size];

    const variantClass = {
      primary:
        'bg-phosphor text-white border-phosphor hover:bg-phosphor-dim hover:border-phosphor-dim active:bg-phosphor-dim',
      secondary:
        'bg-white text-text-primary border-ink-500 hover:bg-ink-800 hover:border-ink-300',
      ghost:
        'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-ink-800',
      danger:
        'bg-white text-danger border-danger/30 hover:bg-danger/5 hover:border-danger',
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
            <span className="block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
