'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Search,
  Clock,
  ArrowRight,
  Database,
  RefreshCw,
  Plus,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { agentApiClient } from '@/lib/api/client';
import { useToast } from '@/lib/context/ToastContext';
import type { ThreadSummary, StoredMessageRecord } from '@/lib/types/api';

export default function ConversationsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessageRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Load thread list
  const fetchThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const res = await agentApiClient.listThreads(50);
      if (res?.threads) {
        setThreads(res.threads);
        // Default select the first thread if none is selected
        if (!selectedThreadId && res.threads.length > 0) {
          setSelectedThreadId(res.threads[0].thread_id);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch threads';
      addToast({
        title: 'Session Fetch Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsLoadingThreads(false);
    }
  }, [addToast, selectedThreadId]);

  // Load message history for selected thread
  const fetchMessages = useCallback(
    async (threadId: string) => {
      setIsLoadingMessages(true);
      try {
        const res = await agentApiClient.getThreadHistory(threadId, 50);
        if (res?.messages) {
          setMessages(res.messages);
        } else {
          setMessages([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch history';
        addToast({
          title: 'History Error',
          message: msg,
          type: 'error',
        });
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchThreads();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchThreads]);

  useEffect(() => {
    if (selectedThreadId) {
      const timer = setTimeout(() => {
        fetchMessages(selectedThreadId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedThreadId, fetchMessages]);

  // Filtered threads list based on search term
  const filteredThreads = useMemo(() => {
    if (!searchTerm.trim()) return threads;
    const lower = searchTerm.toLowerCase();
    return threads.filter(
      (t) =>
        t.thread_id.toLowerCase().includes(lower) ||
        (t.last_message_preview && t.last_message_preview.toLowerCase().includes(lower))
    );
  }, [threads, searchTerm]);

  const selectedThread = threads.find((t) => t.thread_id === selectedThreadId);

  // Copy Thread ID
  const handleCopyThreadId = () => {
    if (!selectedThreadId) return;
    navigator.clipboard.writeText(selectedThreadId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    addToast({
      title: 'Thread ID Copied',
      message: 'Thread ID copied to clipboard.',
      type: 'info',
    });
  };

  // Export Transcript as JSON
  const handleExportJson = () => {
    if (!selectedThreadId || messages.length === 0) return;
    const payload = {
      thread_id: selectedThreadId,
      message_count: messages.length,
      exported_at: new Date().toISOString(),
      messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${selectedThreadId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      title: 'Transcript Exported',
      message: 'JSON transcript downloaded.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            Conversation Store & Audit Explorer
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Inspection of persistent conversational turns, route metadata, and multi-agent execution runs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="workbench"
            size="sm"
            onClick={fetchThreads}
            isLoading={isLoadingThreads}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingThreads ? 'animate-spin' : ''}`} />}
          >
            Refresh Store
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/playground')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Session
          </Button>
        </div>
      </div>

      {/* 2-Column Split Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* Left Column (4 Cols): Thread List Explorer */}
        <div className="md:col-span-4 flex flex-col bg-slate-925/90 border border-slate-800 rounded-lg overflow-hidden">
          {/* Search Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/60 shrink-0 space-y-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by thread ID or message…"
              icon={Search}
              className="text-xs"
            />
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 px-1">
              <span>{filteredThreads.length} threads in store</span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-sky-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          {/* Threads Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-850/80 p-1">
            {isLoadingThreads ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                {searchTerm ? 'No threads matching search query.' : 'No active threads found in store.'}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.thread_id === selectedThreadId;
                return (
                  <button
                    key={thread.thread_id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.thread_id)}
                    className={`w-full text-left p-3 rounded transition-all select-none space-y-1.5 ${
                      isSelected
                        ? 'bg-slate-900 border border-emerald-500/50 shadow-sm shadow-emerald-950/20'
                        : 'hover:bg-slate-900/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-200 truncate">
                        {thread.thread_id.slice(0, 18)}...
                      </span>
                      <Badge variant={isSelected ? 'success' : 'neutral'}>
                        {thread.message_count} turns
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400 font-sans line-clamp-2 leading-relaxed">
                      {thread.last_message_preview || 'No preview available.'}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 pt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{thread.last_message_at || 'Recent'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (8 Cols): Selected Thread History & Audit Inspector */}
        <div className="md:col-span-8 flex flex-col bg-slate-925/90 border border-slate-800 rounded-lg overflow-hidden">
          {selectedThread ? (
            <>
              {/* Detail Header */}
              <div className="p-3.5 px-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-slate-400">Thread:</span>
                  <span className="font-mono text-xs font-bold text-slate-100 truncate">
                    {selectedThread.thread_id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyThreadId}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-900 transition-colors"
                    title="Copy Thread ID"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="workbench"
                    size="sm"
                    onClick={handleExportJson}
                    disabled={messages.length === 0}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Export JSON
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push(`/playground?thread=${selectedThread.thread_id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Resume in Playground
                  </Button>
                </div>
              </div>

              {/* Message Transcript Viewer */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-20 w-3/4" />
                    <Skeleton className="h-28 w-5/6" />
                    <Skeleton className="h-20 w-3/4" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-xs font-mono text-slate-500 space-y-2">
                    <MessageSquare className="w-6 h-6 text-slate-600 mx-auto" />
                    <p>No messages recorded for this thread yet.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col gap-1.5 ${
                        msg.role === 'human' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Meta Pill */}
                      <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-slate-500">
                        <span className="font-semibold text-slate-400">
                          {msg.role === 'human' ? 'User' : 'Supervisor Response'}
                        </span>
                        {typeof msg.metadata?.route === 'string' && (
                          <Badge variant="workbench">ROUTE: {msg.metadata.route.toUpperCase()}</Badge>
                        )}
                        {msg.run_id && (
                          <span className="text-[10px] text-slate-600">
                            run: {msg.run_id.slice(0, 8)}
                          </span>
                        )}
                        {msg.created_at && (
                          <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                        )}
                      </div>

                      {/* Content Bubble */}
                      <div
                        className={`max-w-[88%] rounded-lg p-3.5 text-xs text-slate-200 leading-relaxed shadow-sm ${
                          msg.role === 'human'
                            ? 'bg-slate-900 border border-slate-800'
                            : 'bg-slate-950 border border-slate-850'
                        }`}
                      >
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={MessageSquare}
                title="Select a Session"
                description="Choose a conversation thread from the left rail to view historical turns and execution metadata."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
