'use client';

import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-md border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-1.5 font-medium">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="uppercase text-slate-300">{language || 'text'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Secure, zero-dependency Markdown parser rendering code blocks, headers, lists, and links.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into code blocks vs regular markdown text
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(renderMarkdownSection(textBefore, `text-${lastIndex}`));
    }

    const language = match[1] || 'text';
    const code = match[2].trimEnd();
    parts.push(<CodeBlock key={`code-${match.index}`} language={language} code={code} />);

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push(renderMarkdownSection(remainingText, `text-${lastIndex}`));
  }

  return <div className={cn('text-sm text-slate-200 leading-relaxed space-y-2', className)}>{parts}</div>;
}

function renderMarkdownSection(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = `${keyPrefix}-line-${i}`;

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key} className="text-sm font-bold text-slate-100 mt-3 mb-1">
          {renderInline(line.substring(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key} className="text-base font-bold text-slate-100 mt-4 mb-1.5 border-b border-slate-800 pb-1">
          {renderInline(line.substring(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={key} className="text-lg font-bold text-slate-100 mt-5 mb-2 border-b border-slate-800 pb-1">
          {renderInline(line.substring(2))}
        </h2>
      );
      continue;
    }

    // Unordered Lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={key} className="ml-4 list-disc text-slate-300">
          {renderInline(line.substring(2))}
        </li>
      );
      continue;
    }

    // Ordered Lists
    const orderedMatch = /^(\d+)\.\s(.*)$/.exec(line);
    if (orderedMatch) {
      elements.push(
        <li key={key} className="ml-4 list-decimal text-slate-300">
          {renderInline(orderedMatch[2])}
        </li>
      );
      continue;
    }

    // Blank lines
    if (!line.trim()) {
      elements.push(<div key={key} className="h-1.5" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key} className="text-slate-300">
        {renderInline(line)}
      </p>
    );
  }

  return <React.Fragment key={keyPrefix}>{elements}</React.Fragment>;
}

function renderInline(text: string): React.ReactNode {
  // Matches inline code `code`, bold **text**, and links [title](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}
