import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  elevated?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function Card({
  className,
  elevated = false,
  title,
  subtitle,
  headerAction,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-800 p-4 transition-colors',
        elevated
          ? 'bg-slate-900/90 shadow-md shadow-black/40 border-slate-750'
          : 'bg-slate-925/80 shadow-sm shadow-black/20',
        className
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-slate-800/80">
          <div className="min-w-0">
            {title && (
              <h3 className="font-semibold text-sm text-slate-100 tracking-tight leading-snug truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 font-mono tracking-tight mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export interface BentoCardProps extends CardProps {
  icon?: React.ReactNode;
  footer?: React.ReactNode;
}

export function BentoCard({
  title,
  subtitle,
  headerAction,
  icon,
  footer,
  className,
  children,
  ...props
}: BentoCardProps) {
  return (
    <Card className={cn('flex flex-col', className)} {...props}>
      {(title || subtitle || headerAction || icon) && (
        <div className="flex items-start justify-between gap-3 mb-3 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
            <div className="min-w-0">
              {title && (
                <h3 className="font-semibold text-sm text-slate-100 tracking-tight leading-snug truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-400 font-mono tracking-tight mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
      {footer && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-xs text-slate-400 font-mono flex items-center justify-between">
          {footer}
        </div>
      )}
    </Card>
  );
}
