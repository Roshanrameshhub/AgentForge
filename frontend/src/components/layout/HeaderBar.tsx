'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Cpu,
  Sun,
  Moon,
  LogOut,
  User,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useTheme } from '@/lib/context/ThemeContext';
import { apiClient } from '@/lib/api/client';
import { StatusIndicator, type StatusType } from '@/components/ui/StatusIndicator';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';

export function HeaderBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [backendStatus, setBackendStatus] = useState<StatusType>('busy');
  const [statusText, setStatusText] = useState<string>('Connecting…');
  const [selectedModel] = useState<string>('gpt-4o-mini');

  const checkReadiness = useCallback(async () => {
    try {
      await apiClient.getReadiness();
      setBackendStatus('ready');
      setStatusText('Ready');
    } catch {
      try {
        await apiClient.getHealth();
        setBackendStatus('busy');
        setStatusText('Initializing');
      } catch {
        setBackendStatus('offline');
        setStatusText('Offline');
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkReadiness();
    }, 0);
    const interval = setInterval(checkReadiness, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkReadiness]);

  // Derive human-readable page title
  const pageTitle = (() => {
    if (pathname.startsWith('/dashboard')) return 'Mission Control Dashboard';
    if (pathname.startsWith('/playground')) return 'Agent Playground';
    if (pathname.startsWith('/conversations')) return 'Conversation History';
    if (pathname.startsWith('/approvals')) return 'Human Approvals';
    if (pathname.startsWith('/knowledge')) return 'Knowledge Base & Graph';
    if (pathname.startsWith('/tools')) return 'MCP Tool Registry';
    if (pathname.startsWith('/observability')) return 'Telemetry & Metrics';
    if (pathname.startsWith('/settings')) return 'Settings & Credentials';
    if (pathname.startsWith('/login')) return 'Authentication Portal';
    return 'Workbench';
  })();

  return (
    <header className="h-13 bg-slate-925/90 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 select-none backdrop-blur-md z-20">
      {/* Left: Active context & title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
          <h1 className="font-semibold text-sm text-slate-100 tracking-tight truncate">
            {pageTitle}
          </h1>
        </div>

        <span className="text-slate-700 hidden sm:inline">|</span>

        {/* Backend readiness status */}
        <Tooltip content="Live health status of FastAPI agent backend (/readyz)">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            <StatusIndicator status={backendStatus} label={statusText} />
          </div>
        </Tooltip>
      </div>

      {/* Right: Telemetry pill, Model badge, Theme & Auth actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Model Indicator */}
        <Tooltip content="Active LLM model configured for orchestrator runs">
          <Badge variant="agent" className="hidden md:inline-flex cursor-default">
            <Cpu className="w-3 h-3 text-sky-400 mr-1" />
            {selectedModel}
          </Badge>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip content={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="text-slate-400 hover:text-slate-200"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </Tooltip>

        {/* User Profile / Logout */}
        {session ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-mono font-medium text-slate-200 truncate max-w-[120px]">
                {session.userId}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center justify-end gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                authenticated
              </span>
            </div>

            <Tooltip content="Sign Out of Session">
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label="Logout"
                className="text-slate-400 hover:text-rose-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <Tooltip content="Sign in with your User ID">
            <Button
              variant="workbench"
              size="sm"
              icon={User}
              onClick={() => {
                router.push('/login');
              }}
            >
              Sign In
            </Button>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
