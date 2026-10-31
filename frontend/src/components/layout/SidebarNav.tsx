'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Terminal,
  MessageSquare,
  CheckSquare,
  Database,
  Wrench,
  Activity,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { microSpring } from '@/lib/motion/springs';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Playground', href: '/playground', icon: Terminal },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Human Approvals', href: '/approvals', icon: CheckSquare },
  { name: 'Knowledge Base', href: '/knowledge', icon: Database },
  { name: 'MCP Tools', href: '/tools', icon: Wrench },
  { name: 'Observability', href: '/observability', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-full bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 transition-all duration-200 z-30 select-none',
        isCollapsed ? 'w-15' : 'w-60'
      )}
    >
      {/* Top: Brand Header */}
      <div>
        <div className="h-13 px-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <Link
            href="/playground"
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="w-7 h-7 rounded bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm shadow-emerald-950/40 group-hover:border-emerald-400 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="flex flex-col min-w-0"
              >
                <span className="font-semibold text-sm text-slate-100 tracking-tight leading-none">
                  AgentForge
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80 tracking-wider uppercase mt-1 leading-none">
                  Multi-Agent v1.0
                </span>
              </motion.div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-md transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/playground' && pathname.startsWith(item.href));

            const buttonContent = (
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2 rounded-md text-xs font-mono font-medium transition-colors group',
                  isActive
                    ? 'text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    transition={microSpring}
                    className="absolute inset-0 bg-slate-900 border border-slate-750/80 rounded-md shadow-inner -z-10"
                  />
                )}
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            return isCollapsed ? (
              <Tooltip key={item.href} content={item.name} side="right">
                {buttonContent}
              </Tooltip>
            ) : (
              <div key={item.href}>{buttonContent}</div>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Orchestration engine status */}
      <div className="p-3 border-t border-slate-800/80">
        {!isCollapsed ? (
          <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
            <div className="flex items-center justify-between text-slate-300 mb-1">
              <span>LangGraph Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-500">
              12 agents active • Supervisor v1
            </div>
          </div>
        ) : (
          <Tooltip content="LangGraph Engine: 12 agents active" side="right">
            <div className="w-8 h-8 mx-auto rounded bg-slate-900 flex items-center justify-center text-emerald-400 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
