'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Terminal,
  Send,
  Square,
  Sparkles,
  Layers,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { ExecutionFlow } from '@/components/agent/ExecutionFlow';
import { HitlInlineApproval } from '@/components/agent/HitlInlineApproval';
import { FeedbackRating } from '@/components/agent/FeedbackRating';
import { agentApiClient } from '@/lib/api/client';
import { streamAgent } from '@/lib/api/stream';
import { useToast } from '@/lib/context/ToastContext';
import type { ChatMessage, MessageRole, ThreadSummary } from '@/lib/types/api';

interface UiMessage {
  id: string;
  role: MessageRole;
  content: string;
  runId?: string | null;
  timestamp: string;
  route?: string;
  toolCalls?: Array<{ name: string; args?: Record<string, unknown> }>;
  isStreaming?: boolean;
  requiresHitl?: boolean;
}

function PlaygroundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // Thread management
  const initialThreadId = searchParams.get('thread') || 'default-thread';
  const [threadId, setThreadId] = useState<string>(initialThreadId);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Playground Console state
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [useStreamingMode, setUseStreamingMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [activeRoute, setActiveRoute] = useState<string>('hybrid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Topology & Telemetry drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<
    'idle' | 'running' | 'completed' | 'failed' | 'paused_hitl'
  >('idle');
  const [executionDurationMs, setExecutionDurationMs] = useState(0);
  const [activeToolCalls, setActiveToolCalls] = useState<Array<{ name: string; args?: Record<string, unknown> }>>([]);

  // Stream cancellation & auto-scroll
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch threads list
  const loadThreads = useCallback(async () => {
    try {
      const res = await agentApiClient.listThreads(30);
      if (res?.threads) {
        setThreads(res.threads);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Fetch thread history
  const loadHistory = useCallback(async (targetThreadId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await agentApiClient.getThreadHistory(targetThreadId, 50);
      if (res?.messages && res.messages.length > 0) {
        const mapped: UiMessage[] = res.messages.map((m, idx) => ({
          id: `${m.run_id}-${idx}`,
          role: m.role,
          content: m.content,
          runId: m.run_id,
          timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString() : '',
          route: typeof m.metadata?.route === 'string' ? m.metadata.route : undefined,
          requiresHitl: m.content.includes('Human approval required before web-answer generation.'),
        }));
        setMessages(mapped);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [scrollToBottom]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      loadThreads();
      if (threadId && threadId !== 'default-thread') {
        loadHistory(threadId);
      } else {
        // Default welcome state
        setMessages([
          {
            id: 'welcome',
            role: 'ai',
            content:
              "**Welcome to AgentForge Workbench.**\n\nI am connected to the 12-agent LangGraph supervisor. I can execute direct reasoning, ChromaDB vector retrieval, live FastMCP web search with human authorization gates, and multi-agent synthesis.\n\nEnter a prompt below to initiate execution.",
            timestamp: new Date().toLocaleTimeString(),
            route: 'hybrid',
          },
        ]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [threadId, loadThreads, loadHistory]);

  // Switch thread
  const handleSelectThread = (newId: string) => {
    setThreadId(newId);
    router.push(`/playground?thread=${newId}`);
    loadHistory(newId);
  };

  // Start new chat session
  const handleNewChat = () => {
    const newId = `thread-${Math.random().toString(36).substring(2, 10)}`;
    setThreadId(newId);
    router.push(`/playground?thread=${newId}`);
    setMessages([
      {
        id: 'new-session',
        role: 'ai',
        content: `**New session initialized** (${newId}). Send a prompt to start execution.`,
        timestamp: new Date().toLocaleTimeString(),
        route: 'hybrid',
      },
    ]);
    setActiveToolCalls([]);
    setExecutionStatus('idle');
    setExecutionDurationMs(0);
  };

  // Stop/Abort generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setExecutionStatus('completed');
      if (timerRef.current) clearInterval(timerRef.current);
      addToast({
        title: 'Stream Stopped',
        message: 'Agent generation was interrupted by user.',
        type: 'info',
      });
    }
  };

  // Submit prompt
  const handleSend = async (overridePrompt?: string) => {
    const messageToSend = (overridePrompt || inputPrompt).trim();
    if (!messageToSend || isStreaming) return;

    setInputPrompt('');
    const userMsgId = `human-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();

    // Append user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'human',
        content: messageToSend,
        timestamp,
      },
      {
        id: aiMsgId,
        role: 'ai',
        content: '',
        timestamp,
        isStreaming: true,
      },
    ]);

    setIsStreaming(true);
    setExecutionStatus('running');
    setExecutionDurationMs(0);
    setActiveToolCalls([]);

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setExecutionDurationMs(Date.now() - startTime);
    }, 100);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (useStreamingMode) {
      // SSE Streaming via POST /stream
      try {
        await streamAgent(
          {
            message: messageToSend,
            thread_id: threadId,
            model: selectedModel,
            stream_tokens: true,
          },
          {
            onToken: (token) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId ? { ...msg, content: msg.content + token } : msg
                )
              );
              scrollToBottom();
            },
            onMessage: (finalMsg) => {
              const requiresHitl =
                typeof finalMsg.content === 'string' &&
                finalMsg.content.includes('Human approval required before web-answer generation.');

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? {
                        ...msg,
                        content: typeof finalMsg.content === 'string' ? finalMsg.content : msg.content,
                        runId: finalMsg.run_id,
                        isStreaming: false,
                        requiresHitl,
                      }
                    : msg
                )
              );

              if (requiresHitl) {
                setExecutionStatus('paused_hitl');
              } else {
                setExecutionStatus('completed');
              }
            },
            onError: (err) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? {
                        ...msg,
                        content: msg.content
                          ? `${msg.content}\n\n*[Execution Error: ${err}]*`
                          : `Execution failed: ${err}`,
                        isStreaming: false,
                      }
                    : msg
                )
              );
              setExecutionStatus('failed');
            },
            onDone: () => {
              setIsStreaming(false);
              if (timerRef.current) clearInterval(timerRef.current);
              setExecutionDurationMs(Date.now() - startTime);
              loadThreads();
            },
          },
          null,
          abortController.signal
        );
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Streaming failed';
          addToast({
            title: 'Agent Error',
            message: msg,
            type: 'error',
          });
          setExecutionStatus('failed');
        }
      } finally {
        setIsStreaming(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } else {
      // Synchronous Invocation via POST /invoke
      try {
        const result: ChatMessage = await agentApiClient.invoke(
          {
            message: messageToSend,
            thread_id: threadId,
            model: selectedModel,
          },
          abortController.signal
        );

        const contentStr =
          typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content, null, 2);

        const requiresHitl = contentStr.includes(
          'Human approval required before web-answer generation.'
        );

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  content: contentStr,
                  runId: result.run_id,
                  isStreaming: false,
                  requiresHitl,
                }
              : msg
          )
        );

        if (requiresHitl) {
          setExecutionStatus('paused_hitl');
        } else {
          setExecutionStatus('completed');
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Execution failed';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: `Failed to execute: ${errMsg}`,
                  isStreaming: false,
                }
              : m
          )
        );
        setExecutionStatus('failed');
      } finally {
        setIsStreaming(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setExecutionDurationMs(Date.now() - startTime);
        loadThreads();
      }
    }
  };

  // Keyboard shortcut: Enter to submit, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast({
      title: 'Copied',
      message: 'Message copied to clipboard.',
      type: 'info',
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col min-w-0 max-w-6xl mx-auto pb-4">
      {/* 1. Technical Top Bar: Session, Model, Topology Drawer Trigger */}
      <div className="h-12 px-4 rounded-t-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Thread:</span>
          </div>

          {/* Thread Switcher Dropdown */}
          <div className="relative">
            <select
              value={threadId}
              onChange={(e) => handleSelectThread(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value={threadId}>{threadId.slice(0, 16)} (Active)</option>
              {threads
                .filter((t) => t.thread_id !== threadId)
                .map((t) => (
                  <option key={t.thread_id} value={t.thread_id}>
                    {t.thread_id.slice(0, 16)} ({t.message_count} turns)
                  </option>
                ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Session
          </Button>
        </div>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-3">
          <Badge
            variant={
              executionStatus === 'running'
                ? 'warning'
                : executionStatus === 'paused_hitl'
                ? 'warning'
                : 'success'
            }
            dot={isStreaming || executionStatus === 'paused_hitl'}
          >
            {isStreaming ? 'STREAMING' : executionStatus === 'paused_hitl' ? 'HITL PAUSED' : 'READY'}
          </Badge>

          <Button
            variant="workbench"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
            leftIcon={<Layers className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Pipeline Inspector
          </Button>
        </div>
      </div>

      {/* 2. Message History Terminal Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-925/80 border-x border-slate-800">
        {isLoadingHistory ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400 space-y-2">
            <span className="animate-pulse">Loading persistent thread messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-slate-500 space-y-3">
            <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
            <p>Ready for prompt input. No messages in this session yet.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${
                msg.role === 'human' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Metadata Header */}
              <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-slate-500">
                <span className="font-semibold text-slate-400">
                  {msg.role === 'human' ? 'You' : 'AgentForge Supervisor'}
                </span>
                {msg.route && <Badge variant="neutral">ROUTE: {msg.route.toUpperCase()}</Badge>}
                {msg.timestamp && <span>{msg.timestamp}</span>}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-[85%] rounded-lg p-3.5 shadow-sm transition-colors text-sm ${
                  msg.role === 'human'
                    ? 'bg-slate-900 border border-slate-800 text-slate-100'
                    : 'bg-slate-950/90 border border-slate-850 text-slate-200'
                }`}
              >
                {/* Content */}
                {msg.content ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  msg.isStreaming && (
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Synthesizing response tokens…</span>
                    </div>
                  )
                )}

                {/* Inline Human-In-The-Loop Approval Card if flagged */}
                {msg.requiresHitl && (
                  <HitlInlineApproval
                    threadId={threadId}
                    query={messages.find((m) => m.role === 'human')?.content || ''}
                    onDecision={(decision) => {
                      if (decision === 'approved') {
                        handleSend('approve');
                      } else {
                        handleSend('reject');
                      }
                    }}
                  />
                )}

                {/* Assistant Message Actions (Copy & Rating) */}
                {msg.role === 'ai' && !msg.isStreaming && (
                  <div className="mt-3 pt-2.5 border-t border-slate-850/80 flex items-center justify-between gap-4 text-xs">
                    <FeedbackRating runId={msg.runId} />

                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-900"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* 3. Multi-Line Prompt Composer & Action Bar */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-b-lg space-y-2 shrink-0">
        {/* Quick Suggestion Chips */}
        {messages.length <= 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
            <span className="text-[11px] text-slate-500 shrink-0">Try:</span>
            {[
              'Summarize the multi-agent supervisor architecture',
              'Search web: latest frontier AI reasoning models',
              'Calculate: sqrt(144) * 3.14159 / 2',
            ].map((suggestion, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => setInputPrompt(suggestion)}
                className="shrink-0 px-2.5 py-1 rounded border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 transition-colors text-[11px]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input Textarea & Send Control */}
        <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Type prompt to execute across multi-agent LangGraph topology… (Enter to send, Shift+Enter for newline)"
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none font-sans text-xs leading-relaxed"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            {isStreaming ? (
              <Button
                variant="danger"
                size="sm"
                onClick={handleStop}
                leftIcon={<Square className="w-3.5 h-3.5" />}
              >
                Stop
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim()}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send
              </Button>
            )}
          </div>
        </div>

        {/* Stream Settings & Shortcuts bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-400">
              <input
                type="checkbox"
                checked={useStreamingMode}
                onChange={(e) => setUseStreamingMode(e.target.checked)}
                className="rounded border-slate-750 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <span>SSE Token Stream</span>
            </label>
            <span className="text-slate-700">|</span>
            <label className="flex items-center gap-1">
              <span>Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
              </select>
            </label>
            <span className="text-slate-700">|</span>
            <label className="flex items-center gap-1">
              <span>Route:</span>
              <select
                value={activeRoute}
                onChange={(e) => setActiveRoute(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="hybrid">hybrid</option>
                <option value="direct">direct</option>
                <option value="web">web</option>
                <option value="rag">rag</option>
              </select>
            </label>
          </div>

          <div className="hidden sm:inline">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-850 text-slate-300">Enter</kbd> to run</span>
          </div>
        </div>
      </div>

      {/* 4. Slide-Out Pipeline & Execution Flow Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Multi-Agent Pipeline Inspector"
        side="right"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Live inspection of the 5 execution stages in the LangGraph supervisor workflow for session{' '}
            <code className="text-emerald-400">{threadId}</code>.
          </p>

          <ExecutionFlow
            status={executionStatus}
            activeRoute={activeRoute}
            executionTimeMs={executionDurationMs}
            toolCalls={activeToolCalls}
          />
        </div>
      </Drawer>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-full flex items-center justify-center p-8 text-xs font-mono text-slate-500">
          <span>Loading AgentForge playground…</span>
        </div>
      }
    >
      <PlaygroundContent />
    </React.Suspense>
  );
}
