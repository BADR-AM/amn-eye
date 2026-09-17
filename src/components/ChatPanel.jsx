import React, { useState, useRef, useEffect, Component } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  BrainCircuit, 
  ChevronDown, 
  ChevronLeft,
  X
} from 'lucide-react';
import { authHeaders } from '../utils/auth';
import LiquidOrb from './LiquidOrb';

// ErrorBoundary to catch ReactMarkdown parsing errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-rose-400 text-xs p-2">خطأ في تنسيق النص: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

export default function ChatPanel({ isOpen, onClose, activeBatch }) {
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      content: 'أهلاً بك! أنا **المساعد الذكي لمنظومة فحص وتسجيل المجندين** لوحدة الأمن والتحريات.\n\nيمكنك سؤالي باللغة العربية عن أي استعلام أمني أو إحصائي بأسلوبك، مثل:\n* **تيكتات الاشتباه الأمني والجنائي والسياسي**\n* **الحالات غير المتزنة نفسياً وعصبياً**\n* **سجل التحركات ومستشفيات الشرطة بطنطا ومدينة نصر**\n* **بيان أصحاب الحرف والمهن والورش**\n* **المجندين الذين سبق لهم السفر خارج مصر**\n* **إحصائيات المتزوجين وتوزيع السرايا والمؤهلات**',
      suggestions: ['تيكتات الاشتباه الأمني', 'الحالات غير المتزنة نفسياً', 'بيان تحركات مستشفيات الشرطة', 'حصر أصحاب الحرف والمهن', 'المجندين المتزوجين', 'توزيع المؤهلات العلمية']
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState({});
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
      textareaRef.current.style.overflowY = scrollHeight > 120 ? 'auto' : 'hidden';
    }
  }, [input]);

  const toggleThought = (idx) => {
    setExpandedThoughts(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSend = async (e, overrideText = null) => {
    e?.preventDefault();
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    if (!overrideText) setInput('');
    setIsLoading(true);

    const currentMessages = [...messages, { role: 'user', content: textToSend.trim() }];
    const nextIdx = currentMessages.length;

    // Placeholder model message
    setMessages([...currentMessages, { role: 'model', content: '', thoughts: '', suggestions: [] }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: currentMessages.slice(0, -1)
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'تعذر الاتصال بالمساعد الذكي');
      }

      if (!response.body) throw new Error('لا يوجد تدفق للردود');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let thoughtsAccumulator = '';
      let contentAccumulator = '';
      let suggestionsList = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') continue;

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.type === 'THOUGHT') {
                thoughtsAccumulator += (thoughtsAccumulator ? '\n' : '') + parsed.content;
              } else if (parsed.type === 'FINAL_RESPONSE') {
                contentAccumulator += parsed.content;
              } else if (parsed.type === 'SUGGESTION') {
                suggestionsList.push(parsed.content);
              }

              // Update state progressively
              setMessages(prev => {
                const updated = [...prev];
                updated[nextIdx] = {
                  role: 'model',
                  content: contentAccumulator,
                  thoughts: thoughtsAccumulator,
                  suggestions: suggestionsList
                };
                return updated;
              });
            } catch (err) {
              console.error('SSE JSON parse error:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[nextIdx] = {
          role: 'model',
          content: 'عذراً، حدث خطأ في الاتصال بالمساعد الذكي: ' + error.message,
          thoughts: '',
          suggestions: ['إعادة المحاولة']
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-darkslate-900/98 dark:bg-zinc-950/98 border-r border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300">
      
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-darkslate-850 dark:bg-zinc-900 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <LiquidOrb size={38} state={isLoading ? 'thinking' : 'idle'} />
            {isLoading && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent font-black">
                وكيل التحريات الذكي
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                isLoading 
                  ? 'bg-purple-900/50 text-purple-300 border-purple-500/40 animate-pulse' 
                  : 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
              }`}>
                {isLoading ? 'جاري التفكير...' : 'جاهز'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">تحليل واستعلام قاعدة بيانات المجندين لحظياً</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            
            {/* Role Header */}
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400 px-1">
              {msg.role === 'user' ? (
                <>
                  <span>أنت</span>
                  <User className="w-3 h-3 text-slate-400" />
                </>
              ) : (
                <>
                  <LiquidOrb size={18} state={isLoading && idx === messages.length - 1 ? 'thinking' : 'idle'} />
                  <span className="text-indigo-300 font-bold">وكيل التحريات الذكي</span>
                </>
              )}
            </div>

            {/* Collapsible Thoughts Block if present */}
            {msg.thoughts && (
              <div className="w-full mb-2 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleThought(idx)}
                  className="w-full px-3 py-1.5 text-right flex items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-850/50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />
                    مسار التفكير والاستعلام في قاعدة البيانات
                  </span>
                  {expandedThoughts[idx] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
                {expandedThoughts[idx] && (
                  <div className="p-3 text-[11px] text-slate-400 border-t border-slate-800/60 font-mono whitespace-pre-wrap leading-relaxed bg-black/20">
                    {msg.thoughts}
                  </div>
                )}
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`max-w-[90%] rounded-2xl p-3.5 shadow-md leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                  : 'bg-darkslate-850 border border-slate-800 text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.content ? (
                <ErrorBoundary>
                  <div className="prose prose-invert prose-xs max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-emerald-300 [&>h3]:mt-2 [&>h3]:mb-1 [&>ul]:list-disc [&>ul]:pr-4 [&>table]:w-full [&>table]:my-2 [&>table]:text-[11px] [&>table_th]:border-b [&>table_th]:border-slate-700 [&>table_th]:pb-1 [&>table_td]:py-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </ErrorBoundary>
              ) : (
                <div className="py-1">
                  <LiquidOrb
                    size={28}
                    state="thinking"
                    showPill={true}
                    pillText="جاري الاستعلام وتحليل البيانات..."
                  />
                </div>
              )}
            </div>

            {/* Interactive Suggestions Pills */}
            {msg.suggestions && msg.suggestions.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[90%]">
                {msg.suggestions.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={(e) => handleSend(e, sug)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-emerald-600/30 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 transition-all text-right"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-slate-800 bg-darkslate-850 dark:bg-zinc-900">
        <form onSubmit={handleSend} className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="اسأل المساعد الذكي بالعربية (Enter للإرسال)..."
            className="flex-1 bg-darkslate-900 border border-slate-700/80 focus:border-emerald-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50 transition-all"
            title="إرسال (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 -scale-x-100" />
            )}
          </button>
        </form>
        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1">
          <span>المساعد يستعلم مباشرة من قاعدة بيانات المجندين</span>
          <span>Shift+Enter لسطر جديد</span>
        </div>
      </div>

    </div>
  );
}
