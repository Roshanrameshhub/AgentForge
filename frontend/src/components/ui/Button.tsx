'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'workbench'
  | 'ghost'
  | 'danger'
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: LucideIcon;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      icon: Icon,
      leftIcon,
      rightIcon,
      iconPosition = 'left',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-sm shadow-emerald-950/40 border border-emerald-500/30',
      secondary:
        'bg-slate-900 text-slate-100 hover:bg-slate-800 active:bg-slate-950 border border-slate-800 shadow-sm',
      workbench:
        'bg-slate-950 text-slate-200 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 font-mono text-xs shadow-inner',
      outline:
        'bg-transparent text-slate-200 border border-slate-700/80 hover:bg-slate-800/60 active:bg-slate-800',
      ghost:
        'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-850 active:bg-slate-800 border border-transparent',
      danger:
        'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 active:bg-rose-900 border border-rose-800/80',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'h-8 px-2.5 rounded text-xs gap-1.5',
      md: 'h-9 px-3.5 rounded-md text-sm gap-2',
      lg: 'h-11 px-5 rounded-md text-base gap-2.5',
      icon: 'h-8 w-8 rounded p-0',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
        {!isLoading && !leftIcon && Icon && iconPosition === 'left' && (
          <Icon className={cn('shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
        {!isLoading && !rightIcon && Icon && iconPosition === 'right' && (
          <Icon className={cn('shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
