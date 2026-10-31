'use client';

import React, { useState } from 'react';
import { Settings, Moon, Sun, Monitor, LogOut, UserCheck } from 'lucide-react';
import { BentoCard, Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/context/AuthContext';
import { useTheme } from '@/lib/context/ThemeContext';
import { useToast } from '@/lib/context/ToastContext';
import { Dialog } from '@/components/ui/Dialog';

export default function SettingsPage() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      addToast({
        title: 'Token Copied',
        message: 'Active Bearer token copied to clipboard.',
        type: 'info',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Workbench Settings & Configuration
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Active session identity, theme preferences, and backend environment configuration.
        </p>
      </div>

      {/* Grid Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Session */}
        <BentoCard
          title="Active Session Identity"
          subtitle="PBKDF2 Authenticated User"
          icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          headerAction={
            <Badge variant={isAuthenticated ? 'success' : 'neutral'} dot={isAuthenticated}>
              {isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}
            </Badge>
          }
        >
          <div className="space-y-3">
            <div className="p-3 rounded bg-slate-950 border border-slate-850 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Username:</span>
                <span className="text-slate-100 font-bold">{user?.username || 'Guest / Dev Mode'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">User ID:</span>
                <span className="text-slate-300">{user?.id || 'local-guest'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Bearer Token:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">
                    {token
                      ? showToken
                        ? `${token.slice(0, 16)}...`
                        : '••••••••••••••••'
                      : 'None'}
                  </span>
                  {token && (
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[11px] text-sky-400 hover:underline"
                    >
                      {showToken ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {token && (
                <Button variant="workbench" size="sm" onClick={handleCopyToken}>
                  Copy Token
                </Button>
              )}
              {isAuthenticated && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowLogoutConfirm(true)}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Theme Preferences */}
        <BentoCard
          title="Workbench Appearance"
          subtitle="Obsidian developer palette & contrast"
          icon={<Monitor className="w-4 h-4 text-sky-400" />}
          headerAction={<Badge variant="workbench">{theme.toUpperCase()} MODE</Badge>}
        >
          <p className="text-xs text-slate-300 font-sans mb-3">
            Choose between dark obsidian workbench and high-clarity light theme. System preference sync is enabled by default.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 p-3 rounded border text-xs font-mono transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-4 h-4" />
              Dark (Obsidian)
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 p-3 rounded border text-xs font-mono transition-colors ${
                theme === 'light'
                  ? 'bg-slate-100 border-emerald-600 text-emerald-700'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4" />
              Light (Studio)
            </button>
          </div>
        </BentoCard>
      </div>

      {/* Backend Environment Configuration Card */}
      <Card
        title="Backend Integration & Endpoints"
        subtitle="Zero-disruption FastAPI proxy architecture"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded bg-slate-950 border border-slate-850 font-mono text-xs space-y-2 text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Client API Base:</span>
              <span className="text-emerald-400">/api/backend</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">FastAPI Internal Target:</span>
              <span className="text-slate-200">http://127.0.0.1:8000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Stream Transport:</span>
              <span className="text-sky-400">Server-Sent Events (SSE) text/event-stream</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Authentication Protocol:</span>
              <span className="text-slate-200">Custom PBKDF2 HMAC-SHA256 Token</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            The frontend communicates with the FastAPI service using Next.js route rewrites. This resolves browser CORS restrictions without requiring modifications to the backend codebase. All 13 verified endpoints are mapped directly to their respective handlers.
          </p>
        </div>
      </Card>

      {/* Logout Confirmation Modal */}
      <Dialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Sign Out of AgentForge"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Are you sure you want to end your current session? You will need to log back in with your username and password to invoke agents and inspect private threads.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                logout();
                setShowLogoutConfirm(false);
                addToast({
                  title: 'Signed Out',
                  message: 'Your local session token has been cleared.',
                  type: 'info',
                });
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
