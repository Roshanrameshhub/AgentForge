'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, ArrowRight, Database } from 'lucide-react';
import { BentoCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ConversationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const sampleThreads = [
    {
      id: '847c6285-8fc9-4560-a83f-4e6285809254',
      date: '2026-10-30 14:22:01',
      messagesCount: 8,
      lastMessage: 'Autonomous AI developments announced today across frontier research labs.',
    },
    {
      id: '394e1120-7ab3-4d22-9211-1a3b4c5d6e7f',
      date: '2026-10-29 19:15:40',
      messagesCount: 4,
      lastMessage: 'FastAPI service architecture and PostgreSQL checkpointer state continuity.',
    },
    {
      id: '502a9941-2cd4-4011-8933-4f5e6d7c8b9a',
      date: '2026-10-28 11:05:12',
      messagesCount: 12,
      lastMessage: 'Knowledge Graph entity relationships between Streamlit and LangGraph supervisor.',
    },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Search & Filter Bar */}
      <BentoCard
        title="Session History Explorer"
        subtitle="Durable Conversation Store (PostgreSQL / SQLite)"
        icon={<Database className="w-4 h-4 text-sky-400" />}
        headerAction={
          <Badge variant="neutral">3 Persisted Threads</Badge>
        }
      >
        <div className="flex gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversation thread ID or message preview..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </BentoCard>

      {/* Thread List Table */}
      <div className="space-y-2">
        {sampleThreads.map((thread) => (
          <BentoCard
            key={thread.id}
            className="hover:border-slate-700 transition-colors cursor-pointer group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-emerald-400 truncate">
                    {thread.id}
                  </span>
                  <Badge variant="neutral">{thread.messagesCount} msgs</Badge>
                </div>
                <p className="text-xs text-slate-300 font-sans truncate">
                  {thread.lastMessage}
                </p>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{thread.date}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  variant="workbench"
                  size="sm"
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={() => {
                    router.push(`/playground?thread=${thread.id}`);
                  }}
                >
                  Resume in Playground
                </Button>
              </div>
            </div>
          </BentoCard>
        ))}
      </div>
    </div>
  );
}
