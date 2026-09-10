import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import KioskForm from './components/KioskForm';
import MediaCapture from './components/MediaCapture';
import RecruitModal from './components/RecruitModal';
import OfficialReport from './components/OfficialReport';
import BatchesModal from './components/BatchesModal';
import NetworkModal from './components/NetworkModal';
import BackupManagerModal from './components/BackupManagerModal';
import ChatPanel from './components/ChatPanel';
import LoginPage from './components/LoginPage';
import SplashScreen from './components/SplashScreen';
import Toast from './components/Toast';
import { isLoggedIn as checkLoggedIn, setToken, clearToken, authHeaders } from './utils/auth';

export default function App() {
  // Splash Screen initial load
  const [showSplash, setShowSplash] = useState(true);

  // Auth
  const [loggedIn, setLoggedIn] = useState(checkLoggedIn());

  // Current view: 'dashboard' | 'kiosk' | 'media'
  const [view, setView] = useState('dashboard');

  // Theme: 'dark' | 'light'
  const [theme, setTheme] = useState('dark');

  // Active recruit for dossier / print modals
  const [selectedRecruit, setSelectedRecruit] = useState(null);
  const [printRecruit, setPrintRecruit] = useState(null);

  // Dialog & Panel states
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Backend state
  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [stats, setStats] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);

  // Intermediate form data passed from KioskForm to MediaCapture
  const [kioskFormData, setKioskFormData] = useState(null);

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // Auth handlers
  const handleLogin = (token) => {
    setToken(token);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    clearToken();
    setLoggedIn(false);
    setView('dashboard');
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    // Always keep dark mode
    setTheme('dark');
    document.documentElement.classList.add('dark');
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load initial backend state
  const loadInitialData = async () => {
    try {
      const headers = authHeaders();

      // 1. Fetch batches (public)
      const batchesRes = await fetch('/api/batches');
      if (batchesRes.ok) {
        const bData = await batchesRes.json();
        setBatches(bData);
        const active = bData.find(b => b.active === 1) || bData[0];
        setActiveBatch(active);
      }

      // 2. Fetch stats (protected)
      const statsRes = await fetch('/api/stats', { headers });
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      } else if (statsRes.status === 401) {
        handleLogout();
        return;
      }

      // 3. Fetch network info for Wi-Fi sharing (public)
      const netRes = await fetch('/api/network-info');
      if (netRes.ok) {
        const nData = await netRes.json();
        setNetworkInfo(nData);
      }
    } catch (err) {
      console.error('Error connecting to backend:', err);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      loadInitialData();
    }
  }, [loggedIn]);

  // Global hotkeys (e.g. F2 to start registration)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' && view === 'dashboard' && loggedIn) {
        e.preventDefault();
        setView('kiosk');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, loggedIn]);

  // Handlers
  const handleKioskComplete = (formData) => {
    setKioskFormData(formData);
    setView('media');
  };

  const handleSaveSuccess = (savedRecruit) => {
    setView('dashboard');
    setKioskFormData(null);
    loadInitialData();
    setSelectedRecruit(savedRecruit);
    showToast('تم تسجيل المجند بنجاح');
  };

  const handleDeleteRecruit = async (recruitId) => {
    try {
      const res = await fetch(`/api/recruits/${recruitId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('فشل الحذف');
      if (selectedRecruit && selectedRecruit.id === recruitId) {
        setSelectedRecruit(null);
      }
      loadInitialData();
      showToast('تم حذف ملف المجند بنجاح');
    } catch (err) {
      showToast('خطأ أثناء الحذف: ' + err.message, 'error');
    }
  };

  // Initial Application Launch / Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Not logged in — show login page
  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-darkslate-950 dark:bg-zinc-950 text-slate-100 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Toast notification */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* App Header (visible in dashboard mode) */}
      {view === 'dashboard' && (
        <Header
          activeBatch={activeBatch}
          onOpenKiosk={() => setView('kiosk')}
          onOpenBatches={() => setShowBatchesModal(true)}
          onOpenNetwork={() => setShowNetworkModal(true)}
          onOpenBackup={() => setShowBackupModal(true)}
          onOpenAiChat={() => setIsChatOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          networkInfo={networkInfo}
          onRefresh={loadInitialData}
          onLogout={handleLogout}
        />
      )}

      {/* Main Dashboard View */}
      {view === 'dashboard' && (
        <main className="flex-1">
          <Dashboard
            stats={stats}
            batches={batches}
            activeBatch={activeBatch}
            onOpenKiosk={() => setView('kiosk')}
            onSelectRecruit={(r) => setSelectedRecruit(r)}
            onPrintRecruit={(r) => setPrintRecruit(r)}
            onDeleteRecruit={handleDeleteRecruit}
            onOpenAiChat={() => setIsChatOpen(true)}
            onRefresh={loadInitialData}
          />
        </main>
      )}

      {/* Kiosk Form Mode */}
      {view === 'kiosk' && (
        <KioskForm
          activeBatch={activeBatch}
          onComplete={handleKioskComplete}
          onCancel={() => {
            setKioskFormData(null);
            setView('dashboard');
          }}
          initialData={kioskFormData}
        />
      )}

      {/* Media Capture Station */}
      {view === 'media' && kioskFormData && (
        <MediaCapture
          formData={kioskFormData}
          onSaveSuccess={handleSaveSuccess}
          onBack={() => setView('kiosk')}
          onCancel={() => setView('dashboard')}
        />
      )}

      {/* Recruit Dossier Modal */}
      {selectedRecruit && (
        <RecruitModal
          recruit={selectedRecruit}
          onClose={() => setSelectedRecruit(null)}
          onPrint={(r) => {
            setSelectedRecruit(null);
            setPrintRecruit(r);
          }}
          onDelete={handleDeleteRecruit}
        />
      )}

      {/* Official A4 Printable Examination Report */}
      {printRecruit && (
        <OfficialReport
          recruit={printRecruit}
          onClose={() => setPrintRecruit(null)}
        />
      )}

      {/* Batches Management Modal */}
      {showBatchesModal && (
        <BatchesModal
          batches={batches}
          activeBatch={activeBatch}
          onSetActiveBatch={(b) => setActiveBatch(b)}
          onClose={() => setShowBatchesModal(false)}
          onRefresh={loadInitialData}
        />
      )}

      {/* Wi-Fi & Local Network Sync Modal */}
      {showNetworkModal && (
        <NetworkModal
          networkInfo={networkInfo}
          onClose={() => setShowNetworkModal(false)}
        />
      )}

      {/* Backup & External Drive Management Modal */}
      {showBackupModal && (
        <BackupManagerModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {/* AI Data Assistant Sliding Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeBatch={activeBatch}
      />

      {/* System Footer Branding */}
      <footer className="w-full text-center py-2.5 bg-darkslate-950/90 dark:bg-zinc-950/90 border-t border-slate-850 dark:border-zinc-850 no-print text-[11px] text-slate-400 font-mono flex items-center justify-center gap-2 flex-wrap">
        <span className="font-bold text-white">SECURITY EYE</span>
        <span>•</span>
        <span className="text-amber-400 font-bold">مركز تدريب المجندين</span>
        <span>•</span>
        <span className="text-blue-400 font-bold">وحدة الأمن والتحريات</span>
        <span>•</span>
        <span>قطاع الأمن المركزي — منطقة وسط الدلتا</span>
        <span>•</span>
        <span className="text-slate-300 font-semibold">Created by SHERIF A.ELRAHMAN</span>
      </footer>

    </div>
  );
}
