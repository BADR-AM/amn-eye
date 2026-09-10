import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans" dir="rtl">
          <div className="max-w-md w-full bg-[#161b22] border border-rose-500/40 rounded-2xl p-8 shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-bold text-white">تنبيه أمني في معالجة الشاشة</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              حدث خطأ أثناء عرض بيانات الشاشة. يمكنك إعادة تحميل الصفحة للعودة فوراً إلى وضع التشغيل الطبيعي.
            </p>

            {this.state.error && (
              <div className="bg-[#090d13] p-3 rounded-xl text-[11px] text-rose-300 font-mono text-left max-h-24 overflow-y-auto border border-rose-900/40" dir="ltr">
                {String(this.state.error.message || this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-950/50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تشغيل الشاشة فوراً</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
