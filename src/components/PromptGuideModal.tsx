import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Copy,
  Check,
  Eye,
  Edit3,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';

interface PromptGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  customGuide: string;
  defaultGuide: string;
  onSaveGuide: (newContent: string) => void;
  onResetGuide: () => void;
}

// Simple and lightweight Markdown-to-JSX renderer for the live preview
function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-5 space-y-1.5 my-3 text-slate-700 dark:text-slate-300">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    // Process bold, italic, inline code
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic text-slate-800 dark:text-slate-200">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded font-mono text-xs bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-semibold"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 shadow-sm">
            <div className="bg-slate-950/80 px-4 py-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800/80">
              {codeLang || 'Text / Code'}
            </div>
            <pre className="p-4 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLang = '';
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Horizontal rules
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="my-5 border-slate-200 dark:border-slate-800" />);
      continue;
    }

    // Headers
    if (rawLine.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3 flex items-center gap-2">
          {formatInline(rawLine.substring(2))}
        </h1>
      );
      continue;
    }
    if (rawLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-5 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          {formatInline(rawLine.substring(3))}
        </h2>
      );
      continue;
    }
    if (rawLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2">
          {formatInline(rawLine.substring(4))}
        </h3>
      );
      continue;
    }

    // Blockquotes & Callouts
    if (rawLine.startsWith('> ')) {
      flushList();
      const content = rawLine.substring(2);
      elements.push(
        <blockquote key={`quote-${i}`} className="my-3 pl-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-r-xl text-xs text-blue-900 dark:text-blue-200">
          {formatInline(content)}
        </blockquote>
      );
      continue;
    }

    // List items
    if (/^[-*•]\s+/.test(trimmed)) {
      inList = true;
      const content = trimmed.replace(/^[-*•]\s+/, '');
      listItems.push(<li key={`li-${i}`}>{formatInline(content)}</li>);
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      inList = true;
      const content = trimmed.replace(/^\d+\.\s+/, '');
      listItems.push(<li key={`li-num-${i}`}>{formatInline(content)}</li>);
      continue;
    }

    // Normal paragraph
    flushList();
    if (trimmed.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="my-2 leading-relaxed text-slate-700 dark:text-slate-300">
          {formatInline(rawLine)}
        </p>
      );
    }
  }

  flushList();
  return elements;
}

export const PromptGuideModal: React.FC<PromptGuideModalProps> = ({
  isOpen,
  onClose,
  customGuide,
  defaultGuide,
  onSaveGuide,
  onResetGuide,
}) => {
  const [editorText, setEditorText] = useState(customGuide || defaultGuide);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [saveToast, setSaveToast] = useState(false);

  // Sync editor text when modal opens or custom/default guide changes externally
  useEffect(() => {
    if (isOpen) {
      setEditorText(customGuide || defaultGuide);
      setSaveToast(false);
    }
  }, [isOpen, customGuide, defaultGuide]);

  const isCustomized = Boolean(customGuide && customGuide.trim() !== defaultGuide.trim());
  const hasUnsavedEdits = editorText.trim() !== (customGuide || defaultGuide).trim();

  // Stats calculation
  const stats = useMemo(() => {
    const lines = editorText.split('\n').length;
    const words = editorText.trim().split(/\s+/).filter(Boolean).length;
    const chars = editorText.length;
    return { lines, words, chars };
  }, [editorText]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGuide(editorText);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset prompt guidelines back to official repository defaults? Your local modifications will be cleared.')) {
      setEditorText(defaultGuide);
      onResetGuide();
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Veo 3 Prompt Engineering Guide
                </h2>
                {isCustomized ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Customized for Your Browser Session
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Official Default Guide Active
                  </span>
                )}
                {hasUnsavedEdits && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                    Unsaved Edits
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Personalized directives are stored in your browser and isolated from other users.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  activeTab === 'editor'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
              title="Copy markdown content to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={!isCustomized && !hasUnsavedEdits}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
              title="Reset back to official default markdown guide"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset to Default</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasUnsavedEdits && isCustomized}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                hasUnsavedEdits
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{hasUnsavedEdits ? 'Save & Apply' : 'Saved'}</span>
            </button>

            <a
              href="/veo-prompt-rules.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Open full-page HTML viewer in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Save Toast Notification */}
        {saveToast && (
          <div className="bg-emerald-500 text-white px-5 py-2 text-xs font-bold flex items-center justify-between animate-fadeIn shadow-inner">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Prompt rules successfully saved to your browser session! Gemini 3.8 Flash will now use your personalized guide for all shots.</span>
            </div>
            <button type="button" onClick={() => setSaveToast(false)} className="hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Main Body: Side-by-Side Editor & Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Column: Markdown Editor */}
          <div
            className={`flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100 ${
              activeTab === 'editor' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold text-slate-200">Markdown Directives Editor</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {stats.lines} lines · {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars
              </div>
            </div>

            <div className="flex-1 p-3 overflow-auto">
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder="Enter prompt engineering directives..."
                className="w-full h-full min-h-[420px] bg-transparent text-slate-100 font-mono text-xs sm:text-[13px] leading-relaxed resize-none focus:outline-none placeholder-slate-600 selection:bg-purple-600/40"
                spellCheck={false}
              />
            </div>

            <div className="p-2.5 px-4 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Markdown shortcuts: <code># Header</code>, <code>**bold**</code>, <code>`code`</code>, <code>- List</code></span>
              <span className="text-purple-400 font-semibold">Per-user isolated</span>
            </div>
          </div>

          {/* Right Column: Live Styled Preview */}
          <div
            className={`flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 ${
              activeTab === 'preview' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span>Live Rendered Preview</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Auto-Refreshes</span>
            </div>

            <div className="flex-1 p-6 sm:p-8 overflow-y-auto text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
              {renderMarkdown(editorText)}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              All prompt synthesis, single-shot re-creation, and auto-brainstorming will execute with these active guidelines.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
