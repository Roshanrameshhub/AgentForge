'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  LogOut,
  UserCheck,
  Shield,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Cpu,
  Zap,
  Sliders,
  Trash2,
  AlertTriangle,
  Server,
  Lock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useAuth } from '@/lib/context/AuthContext';
import { useTheme } from '@/lib/context/ThemeContext';
import { useToast } from '@/lib/context/ToastContext';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, session, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  // Local state for UI toggles
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Application preferences (persisted in localStorage)
  const [streamMode, setStreamMode] = useState<boolean>(true);
  const [defaultModel, setDefaultModel] = useState<string>('gpt-4o-mini');
  const [requireHitl, setRequireHitl] = useState<boolean>(true);
  const [maxSearchResults, setMaxSearchResults] = useState<number>(5);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedStream = localStorage.getItem('agentforge_pref_stream');
      const savedModel = localStorage.getItem('agentforge_pref_model');
      const savedHitl = localStorage.getItem('agentforge_pref_hitl');
      const savedMaxResults = localStorage.getItem('agentforge_pref_max_results');

      queueMicrotask(() => {
        if (savedStream !== null) setStreamMode(savedStream === 'true');
        if (savedModel) setDefaultModel(savedModel);
        if (savedHitl !== null) setRequireHitl(savedHitl === 'true');
        if (savedMaxResults) setMaxSearchResults(parseInt(savedMaxResults, 10));
      });
    } catch {
      // Ignore
    }
  }, []);

  // Handlers for updating preferences
  const updateStreamMode = (val: boolean) => {
    setStreamMode(val);
    try {
      localStorage.setItem('agentforge_pref_stream', String(val));
    } catch {
      // Ignore
    }
    addToast({
      title: 'Transport Updated',
      message: val ? 'Enabled SSE streaming transport.' : 'Switched to synchronous execution.',
      type: 'info',
    });
  };

  const updateDefaultModel = (val: string) => {
    setDefaultModel(val);
    try {
      localStorage.setItem('agentforge_pref_model', val);
    } catch {
      // Ignore
    }
    addToast({
      title: 'Default Model Saved',
      message: `Preferred orchestrator model set to ${val}.`,
      type: 'info',
    });
  };

  const updateRequireHitl = (val: boolean) => {
    setRequireHitl(val);
    try {
      localStorage.setItem('agentforge_pref_hitl', String(val));
    } catch {
      // Ignore
    }
    addToast({
      title: 'HITL Gate Policy Updated',
      message: val ? 'Human verification required for web queries.' : 'Bypass requested where permitted.',
      type: 'info',
    });
  };

  const updateMaxSearchResults = (val: number) => {
    setMaxSearchResults(val);
    try {
      localStorage.setItem('agentforge_pref_max_results', String(val));
    } catch {
      // Ignore
    }
  };

  const handleCopyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      addToast({
        title: 'Token Copied',
        message: 'Active Bearer authorization token copied to clipboard.',
        type: 'info',
      });
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('agentforge_pref_stream');
      localStorage.removeItem('agentforge_pref_model');
      localStorage.removeItem('agentforge_pref_hitl');
      localStorage.removeItem('agentforge_pref_max_results');
    } catch {
      // Ignore
    }
    setShowResetConfirm(false);
    addToast({
      title: 'Preferences Reset',
      message: 'Client-side settings have been restored to defaults.',
      type: 'info',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-100 font-sans pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Platform Settings & Security Configuration
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Active session identity, theme preferences, execution defaults, and verified backend proxy architecture
          </p>
        </div>

        {isAuthenticated ? (
          <Badge variant="success" dot className="font-mono text-xs">
            Authenticated: {user?.username}
          </Badge>
        ) : (
          <Button
            variant="workbench"
            size="sm"
            onClick={() => router.push('/login')}
            className="text-xs font-mono"
          >
            Sign In / Register
          </Button>
        )}
      </div>

      {/* Grid Settings Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Active Session & Identity */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Active Session & Credentials</span>
            </div>
          }
          subtitle="PBKDF2 HMAC-SHA256 Token Authentication"
          headerAction={
            <Badge variant={isAuthenticated ? 'success' : 'neutral'} dot={isAuthenticated}>
              {isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}
            </Badge>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Username:</span>
                <span className="text-slate-100 font-bold">{user?.username || 'Guest / Unauthenticated'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">User ID:</span>
                <span className="text-slate-300">{user?.id || 'anonymous-session'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Token Lifetime:</span>
                <span className="text-slate-400">
                  {session?.expiresAt
                    ? new Date(session.expiresAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Session persistence active'}
                </span>
              </div>

              {/* Masked Token Field */}
              <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-400" /> Bearer Token:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 max-w-[140px] truncate">
                    {token
                      ? showToken
                        ? `${token.slice(0, 16)}…`
                        : '••••••••••••••••'
                      : 'None'}
                  </span>
                  {token && (
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                      title={showToken ? 'Hide token' : 'Reveal token'}
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {token && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={copiedToken ? Check : Copy}
                  onClick={handleCopyToken}
                  className="text-xs font-mono"
                >
                  {copiedToken ? 'Copied' : 'Copy Token'}
                </Button>
              )}

              {isAuthenticated ? (
                <Button
                  variant="danger"
                  size="sm"
                  icon={LogOut}
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-xs font-mono"
                >
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="workbench"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="text-xs font-mono"
                >
                  Log In
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 2. Theme Preferences */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>Workbench Appearance</span>
            </div>
          }
          subtitle="Obsidian developer palette & contrast"
          headerAction={<Badge variant="workbench">{theme.toUpperCase()} MODE</Badge>}
        >
          <div className="space-y-3 font-mono text-xs">
            <p className="text-slate-400 font-sans text-xs leading-relaxed">
              Choose between dark obsidian workbench and clean light studio mode. Theme choice is synchronized across tabs.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-mono transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-emerald-500/60 text-emerald-400 shadow-sm shadow-emerald-950/40 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-4 h-4 text-emerald-400" />
                Dark (Obsidian)
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-mono transition-all ${
                  theme === 'light'
                    ? 'bg-slate-100 border-emerald-600 text-emerald-800 shadow-sm font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                Light (Studio)
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Execution & Inference Defaults Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Execution & Agent Inference Defaults</span>
          </div>
        }
        subtitle="Saved locally and applied across Playground runs"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          {/* Transport Mode Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                Execution Transport Mode
              </span>
              <Badge variant={streamMode ? 'success' : 'neutral'}>
                {streamMode ? 'SSE STREAMING' : 'SYNCHRONOUS'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Server-Sent Events (`POST /stream`) stream tokens in real time. Synchronous mode (`POST /invoke`) waits for full synthesis.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => updateStreamMode(true)}
                className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                  streamMode
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                SSE Stream (/stream)
              </button>
              <button
                type="button"
                onClick={() => updateStreamMode(false)}
                className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                  !streamMode
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Invoke (/invoke)
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Default Inference Model
              </span>
              <Badge variant="agent">{defaultModel}</Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Default LLM model identifier provided to the LangGraph supervisor node.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['gpt-4o-mini', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateDefaultModel(m)}
                  className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                    defaultModel === m
                      ? 'bg-sky-950/60 border-sky-500/60 text-sky-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* HITL Safety Gate Requirement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                HITL Gate Requirement
              </span>
              <Badge variant={requireHitl ? 'warning' : 'neutral'}>
                {requireHitl ? 'VERIFICATION GATE' : 'AUTO-DISPATCH'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              When enabled, queries routed to web search pause at <code className="text-amber-400">web_hitl_gate_agent</code> for approval.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => updateRequireHitl(true)}
                className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                  requireHitl
                    ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Require Gate Review
              </button>
              <button
                type="button"
                onClick={() => updateRequireHitl(false)}
                className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                  !requireHitl
                    ? 'bg-slate-800 border-slate-700 text-slate-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Bypass Gate
              </button>
            </div>
          </div>

          {/* Max Search Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                Max Web Citations Count
              </span>
              <span className="text-slate-300 font-bold">{maxSearchResults} items</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Limit on external search citations returned by DuckDuckGo or FastMCP search engine.
            </p>
            <div className="flex gap-2 pt-1">
              {[3, 5, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateMaxSearchResults(n)}
                  className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                    maxSearchResults === n
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {n} Results
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Backend Environment Architecture & Security Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Backend Integration & Zero-Secret Architecture</span>
          </div>
        }
        subtitle="FastAPI proxy layer and security posture"
      >
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Browser API Gateway:</span>
              <span className="text-emerald-400">/api/backend</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Internal FastAPI Target:</span>
              <span className="text-slate-200">http://127.0.0.1:8000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">FastMCP Stdio Engine:</span>
              <span className="text-sky-400">agent/mcp_tool_server.py (Subprocess)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Authentication Scheme:</span>
              <span className="text-slate-200">Bearer Token (PBKDF2 HMAC-SHA256)</span>
            </div>
          </div>

          <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2 text-[11px] text-slate-300">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-300 block mb-0.5">Strict Zero-Secret Exposure:</strong>
              In accordance with AgentForge security standards, private LLM API keys (Groq, OpenAI) and internal server secrets are kept strictly server-side in the Python runtime. No secrets are bundled or leaked to the client browser.
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Danger Zone: Local Cache Clearance */}
      <Card
        title={
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone</span>
          </div>
        }
        subtitle="Reset cached preferences and local session tokens"
        className="border-rose-900/40 bg-rose-950/10"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
          <div>
            <div className="text-slate-200 font-semibold">Clear Local Client Storage</div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Resets all custom preferences, saved model selections, and cached thread identifiers stored in your browser.
            </p>
          </div>

          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setShowResetConfirm(true)}
            className="text-xs font-mono shrink-0"
          >
            Reset Client Cache
          </Button>
        </div>
      </Card>

      {/* Logout Confirmation Dialog */}
      <Dialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Sign Out of Session"
      >
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <p>
            Are you sure you want to end your session for <strong className="text-slate-100">{user?.username}</strong>?
          </p>
          <p className="text-[11px] text-slate-400">
            Your local Bearer token will be cleared. You can sign back in anytime from the login portal.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={LogOut}
              onClick={() => {
                logout();
                setShowLogoutConfirm(false);
                addToast({
                  title: 'Signed Out',
                  message: 'Your active session has been concluded.',
                  type: 'info',
                });
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reset Cache Confirmation Dialog */}
      <Dialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Local Preferences"
      >
        <div className="space-y-4 font-mono text-xs text-slate-300">
          <p>
            This action will reset your client-side preferences (streaming mode, default model, search bounds) to default values.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={handleClearCache}>
              Confirm Reset
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
