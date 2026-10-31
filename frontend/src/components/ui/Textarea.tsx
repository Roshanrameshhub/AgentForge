import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-md text-sm font-mono p-3 transition-colors resize-y min-h-[80px]',
            'focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/80',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-400 font-mono flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
