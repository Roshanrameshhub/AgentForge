'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/playground');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-slate-950 text-slate-400 font-mono text-xs">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Initializing AgentForge session…</span>
      </div>
    </div>
  );
}
