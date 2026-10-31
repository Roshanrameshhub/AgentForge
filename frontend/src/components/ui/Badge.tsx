import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'agent'
  | 'success'
  | 'warning'
  | 'error'
  | 'sky'
  | 'neutral'
  | 'workbench';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-tight border select-none transition-colors';

  const variants: Record<BadgeVariant, { container: string; dotColor: string }> = {
    default: {
      container: 'bg-slate-900 text-slate-300 border-slate-700/80',
      dotColor: 'bg-slate-400',
    },
    neutral: {
      container: 'bg-slate-950 text-slate-400 border-slate-800',
      dotColor: 'bg-slate-500',
    },
    agent: {
      container: 'bg-slate-900 text-sky-300 border-sky-800/60 shadow-sm shadow-sky-950/20',
      dotColor: 'bg-sky-400',
    },
    sky: {
      container: 'bg-sky-950/40 text-sky-400 border-sky-800/50',
      dotColor: 'bg-sky-400',
    },
    success: {
      container: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50',
      dotColor: 'bg-emerald-400',
    },
    warning: {
      container: 'bg-amber-950/40 text-amber-400 border-amber-800/50',
      dotColor: 'bg-amber-400',
    },
    error: {
      container: 'bg-rose-950/40 text-rose-400 border-rose-800/50',
      dotColor: 'bg-rose-400',
    },
    workbench: {
      container: 'bg-slate-950 text-slate-300 border-slate-800 font-mono text-[10px]',
      dotColor: 'bg-emerald-400',
    },
  };

  const style = variants[variant];

  return (
    <span className={cn(base, style.container, className)} {...props}>
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0 animate-pulse', style.dotColor)}
        />
      )}
      {children}
    </span>
  );
}
