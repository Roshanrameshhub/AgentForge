import React from 'react';
import { cn } from '@/lib/utils';

export type StatusType = 'ready' | 'busy' | 'error' | 'offline' | 'hitl';

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  pulse = true,
  className,
}: StatusIndicatorProps) {
  const statusStyles: Record<StatusType, { dot: string; glow: string; text: string }> = {
    ready: {
      dot: 'bg-emerald-400',
      glow: 'bg-emerald-400/30',
      text: 'text-emerald-400',
    },
    busy: {
      dot: 'bg-sky-400',
      glow: 'bg-sky-400/30',
      text: 'text-sky-400',
    },
    hitl: {
      dot: 'bg-amber-400',
      glow: 'bg-amber-400/30',
      text: 'text-amber-400',
    },
    error: {
      dot: 'bg-rose-400',
      glow: 'bg-rose-400/30',
      text: 'text-rose-400',
    },
    offline: {
      dot: 'bg-slate-500',
      glow: 'bg-slate-500/20',
      text: 'text-slate-500',
    },
  };

  const style = statusStyles[status];

  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              style.glow
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', style.dot)} />
      </span>
      {label && (
        <span className={cn('text-xs font-mono font-medium tracking-tight', style.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
