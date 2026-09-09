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
  X, 
  Sparkles,
  RefreshCw,
  HelpCircle,
  Database
} from 'lucide-react';
import { authHeaders } from '../utils/auth';

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
      content: 'أهلاً بك! أنا **المساعد الذكي لمنظومة فحص وتسجيل المجندين** لوحدة الأمن والتحريات.\n\nيمكنك سؤالي باللغة العربية عن أي إحصائيات أو بيانات خاصة بالمجندين، مثل:\n* توزيع المؤهلات العلمية\n* حصر أصحاب الحرف والمهن\n* التوزيع الجغرافي والمحافظات\n* إحصائيات الدفوع التجنيدية',
      suggestions: ['توزيع المؤهلات العلمية', 'حصر أصحاب الحرف والمهن', 'مقارنة أعداد الدفوع التجنيدية']
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
      // Stream via Server-Sent Events (SSE)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: currentMessages.slice(0, -1)
        })
      });

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
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-darkslate-850 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              مساعد التحريات الذكي (AI)
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h3>
            <p className="text-[11px] text-slate-400">استعلام وتحليل قاعدة بيانات المجندين لحظياً</p>
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
                  <Bot className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">المساعد الذكي</span>
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
                <div className="flex items-center gap-2 text-slate-400 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>جاري استخراج البيانات...</span>
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
