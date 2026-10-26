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
  Printer,
  FileText
} from 'lucide-react';
import { authHeaders } from '../utils/auth';
import Orb, { Orb as LiquidOrb } from './Orb';

// Format markdown report into clean printable HTML for official A4 PDF printing
function formatReportHtml(md) {
  if (!md) return '';
  let text = md.trim().replace(/<think>[\s\S]*?<\/think>/g, '');
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  const lines = text.split('\n');
  let inTable = false;
  let tableRows = [];
  let output = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      if (line.includes('---')) continue;
      const cells = line.split('|').slice(1, -1);
      const isHeader = tableRows.length === 0;
      const tag = isHeader ? 'th' : 'td';
      tableRows.push('<tr>' + cells.map(c => '<' + tag + '>' + c.trim() + '</' + tag + '>').join('') + '</tr>');
    } else {
      if (inTable) {
        output.push('<table class="report-table"><tbody>' + tableRows.join('') + '</tbody></table>');
        inTable = false;
        tableRows = [];
      }

      if (line.startsWith('### ')) {
        output.push('<h3>' + line.substring(4) + '</h3>');
      } else if (line.startsWith('## ')) {
        output.push('<h2>' + line.substring(3) + '</h2>');
      } else if (line.startsWith('# ')) {
        output.push('<h1>' + line.substring(2) + '</h1>');
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        output.push('<li>' + line.substring(2) + '</li>');
      } else if (line.length > 0) {
        output.push('<p>' + line + '</p>');
      }
    }
  }

  if (inTable && tableRows.length > 0) {
    output.push('<table class="report-table"><tbody>' + tableRows.join('') + '</tbody></table>');
  }

  return output.join('\n');
}

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

  const handlePrintReport = (reportContent, queryTitle = 'استعلام أمني وإحصائي') => {
    if (!reportContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
      return;
    }

    const currentDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedHtml = formatReportHtml(reportContent);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير أمني - ${queryTitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 12mm 14mm 12mm;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            background: #fff;
            direction: rtl;
            text-align: right;
            font-size: 11pt;
            line-height: 1.6;
          }
          .header {
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-col {
            font-size: 10pt;
            font-weight: bold;
            line-height: 1.4;
          }
          .header-title {
            text-align: center;
            font-size: 14pt;
            font-weight: 900;
            text-decoration: underline;
            margin: 8px 0;
          }
          .meta-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 10pt;
            display: flex;
            justify-content: space-between;
          }
          .report-body {
            margin-bottom: 24px;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 9.5pt;
          }
          .report-table th, .report-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: right;
          }
          .report-table th {
            background: #e2e8f0;
            font-weight: bold;
            text-align: center;
          }
          .report-table tr:nth-child(even) {
            background: #f8fafc;
          }
          ul, ol {
            padding-right: 20px;
            margin: 8px 0;
          }
          li {
            margin-bottom: 4px;
          }
          p {
            margin: 6px 0;
          }
          h2, h3, h4 {
            margin: 12px 0 6px 0;
            color: #0f172a;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px dashed #64748b;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            color: #475569;
          }
          .signatures {
            margin-top: 36px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-weight: bold;
            font-size: 10.5pt;
          }
          .sig-block {
            width: 220px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-col">
            وزارة الداخلية<br>
            قطاع الأمن المركزي<br>
            منطقة وسط الدلتا
          </div>
          <div class="header-col" style="text-align: left;">
            إدارة الأمن والتحريات<br>
            منظومة عين الأمن VER 02.5.1<br>
            التاريخ: ${currentDate}
          </div>
        </div>

        <div class="header-title">تقرير استعلام وتحريات أمنية معتمد</div>

        <div class="meta-box">
          <div><strong>موضوع الاستعلام:</strong> ${queryTitle}</div>
          <div><strong>المصدر:</strong> قاعدة بيانات المجندين (الذكاء الاصطناعي المحلي)</div>
        </div>

        <div class="report-body">
          ${formattedHtml}
        </div>

        <div class="signatures">
          <div class="sig-block">
            مسؤول التحريات والتشغيل<br><br><br>
            .............................
          </div>
          <div class="sig-block">
            يعتمد ،،،<br>
            رئيس وحدة الأمن والتحريات<br><br>
            .............................
          </div>
        </div>

        <div class="footer">
          <div>وثيقة أمنية سرية ومؤمنة رقمياً • منظومة عين الأمن VER 02.5.1</div>
          <div>صفحة استخراج آلية معتمدة للطباعة أو الحفظ كملف PDF</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-darkslate-900/98 dark:bg-zinc-950/98 border-r border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300">
      
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-darkslate-850 dark:bg-zinc-900 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Orb size={38} state={isLoading ? 'thinking' : 'idle'} />
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
            
            {/* Featured Greeting Hero Card on first message */}
            {idx === 0 && (
              <div className="w-full mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-slate-900 border border-purple-500/25 shadow-lg flex items-center gap-3">
                <div className="relative shrink-0 p-1 rounded-full bg-slate-950/70 border border-purple-500/30 shadow-inner flex items-center justify-center">
                  <Orb size={44} state={isLoading ? 'thinking' : 'idle'} />
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>عين الأمن — الذكاء الاصطناعي المحلي</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">100% Offline</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    متصل مباشرة بقاعدة البيانات ويفهم الأسئلة والمهن بالعامية المصرية
                  </div>
                </div>
              </div>
            )}

            {/* Role Header */}
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400 px-1">
              {msg.role === 'user' ? (
                <>
                  <span>أنت</span>
                  <User className="w-3 h-3 text-slate-400" />
                </>
              ) : (
                <>
                  <div className="rounded-full overflow-hidden border border-purple-500/30 shadow-xs"><Orb size={20} state={isLoading && idx === messages.length - 1 ? 'thinking' : 'idle'} /></div>
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
                  <Orb
                    size={28}
                    state="thinking"
                    showPill={true}
                    pillText="جاري الاستعلام وتحليل البيانات..."
                  />
                </div>
              )}
            </div>

            {/* Print / Export Report as PDF Action */}
            {msg.role === 'model' && msg.content && idx > 0 && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <button
                  type="button"
                  onClick={() => handlePrintReport(msg.content, messages[idx - 1]?.content || 'استعلام أمني وإحصائي')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-bold shadow-sm transition-all"
                  title="تصدير هذا التقرير كملف PDF للطباعة الرسمية"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>طباعة / حفظ تقرير PDF</span>
                </button>
              </div>
            )}

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
