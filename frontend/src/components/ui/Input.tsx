import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, leftIcon, icon: Icon, rightElement, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {(leftIcon || Icon) && (
            <div className="absolute left-3 text-slate-500 pointer-events-none flex items-center justify-center">
              {leftIcon || (Icon && <Icon className="w-4 h-4" />)}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-md text-sm font-mono px-3 py-2 transition-colors',
              'focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightElement && 'pr-10',
              error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/80',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center text-slate-400">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-400 font-mono flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
