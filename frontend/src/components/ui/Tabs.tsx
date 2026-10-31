'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { microSpring } from '@/lib/motion/springs';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-md select-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative z-10 px-3 py-1.5 rounded text-xs font-mono font-medium tracking-tight transition-colors flex items-center gap-2',
              isActive
                ? 'text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {tab.label}
            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                transition={microSpring}
                className="absolute inset-0 bg-slate-850 border border-slate-700/80 rounded shadow-sm -z-10"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
