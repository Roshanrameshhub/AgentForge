'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Shield, ArrowRight, Lock, User, Terminal } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useToast } from '@/lib/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { formatErrorMessage } from '@/lib/api/errors';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validate = (): boolean => {
    setValidationError('');
    const cleanId = userId.trim();
    if (!cleanId) {
      setValidationError('User ID is required.');
      return false;
    }
    const idPattern = /^[a-zA-Z0-9._-]{3,64}$/;
    if (!idPattern.test(cleanId)) {
      setValidationError(
        'User ID must be 3-64 chars (letters, numbers, dot, underscore, hyphen).'
      );
      return false;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (activeTab === 'register') {
        await register(userId.trim(), password);
        toast.success(
          'Account Created',
          `Welcome to AgentForge, ${userId.trim()}! Initialized with PBKDF2 hash.`
        );
      } else {
        await login(userId.trim(), password);
        toast.success('Signed In', `Authenticated session for ${userId.trim()}`);
      }
      router.push('/playground');
    } catch (err) {
      const msg = formatErrorMessage(err);
      setValidationError(msg);
      toast.error('Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-100 select-none relative overflow-hidden">
      {/* Background technical grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-lg bg-slate-900 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-950/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            AgentForge Platform
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Multi-Agent AI Workbench & Autonomous Research System
          </p>
        </div>

        {/* Authentication Card */}
        <Card elevated className="p-6 border-slate-750 bg-slate-900/95 backdrop-blur-md">
          {/* Mode Tabs */}
          <div className="flex justify-center mb-5">
            <Tabs
              tabs={[
                { id: 'login', label: 'Sign In' },
                { id: 'register', label: 'Register Account' },
              ]}
              activeTab={activeTab}
              onChange={(t) => {
                setActiveTab(t as 'login' | 'register');
                setValidationError('');
              }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                User Identifier
              </label>
              <Input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="developer_id"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete={activeTab === 'register' ? 'new-password' : 'current-password'}
                disabled={isLoading}
              />
            </div>

            {validationError && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-xs font-mono text-rose-300">
                {validationError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={ArrowRight}
              iconPosition="right"
              className="w-full mt-2"
            >
              {activeTab === 'register' ? 'Create Account & Sign In' : 'Sign In to Workbench'}
            </Button>
          </form>

          {/* Security & Backend Spec Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>PBKDF2-HMAC-SHA256 (210,000 iterations)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Terminal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Durable persistence via PostgreSQL / SQLite</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
