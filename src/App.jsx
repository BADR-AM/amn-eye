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
import UsersModal from './components/UsersModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import SystemAuditLogModal from './components/SystemAuditLogModal';
import ChatPanel from './components/ChatPanel';
import LoginPage from './components/LoginPage';
import SplashScreen from './components/SplashScreen';
import Toast from './components/Toast';
import MobileApp from './components/MobileApp';
import { isLoggedIn as checkLoggedIn, setToken, clearToken, authHeaders, getUser, setUser } from './utils/auth';

// Helper to determine if user is on a mobile device or prefers mobile view
const detectMobile = () => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('security_eye_view_mode');
  if (saved === 'mobile') return true;
  if (saved === 'desktop') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

export default function App() {
  // Splash Screen initial load
  const [showSplash, setShowSplash] = useState(true);

  // Auth
  const [loggedIn, setLoggedIn] = useState(checkLoggedIn());
  const [currentUser, setCurrentUser] = useState(getUser());

  // Mobile mode detection state
  const [isMobileMode, setIsMobileMode] = useState(detectMobile);

  // Current view: 'dashboard' | 'kiosk' | 'media'
  const [view, setView] = useState('dashboard');

  // Theme: 'dark' | 'light' (persisted)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('security_eye_theme') || 'dark';
    }
    return 'dark';
  });

  // Active recruit for dossier / print modals
  const [selectedRecruit, setSelectedRecruit] = useState(null);
  const [editModeForSelected, setEditModeForSelected] = useState(false);
  const [printRecruit, setPrintRecruit] = useState(null);

  // Dialog & Panel states
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [recruitsRefreshTrigger, setRecruitsRefreshTrigger] = useState(0);

  const triggerRecruitsRefresh = () => {
    setRecruitsRefreshTrigger(Date.now());
    loadInitialData();
  };

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
  const handleLogin = (token, user) => {
    setToken(token);
    if (user) {
      setUser(user);
      setCurrentUser(user);
    }
    setLoggedIn(true);
  };

  const handleLogout = () => {
    clearToken();
    setCurrentUser(null);
    setLoggedIn(false);
    setView('dashboard');
  };

  // Handle automatic session expiration (401)
  useEffect(() => {
    const onSessionExpired = () => {
      handleLogout();
      showToast('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً', 'error');
    };
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  // Toggle Theme
  const handleToggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('security_eye_theme', nextTheme);
      } catch (e) {}
      return nextTheme;
    });
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
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

      // 2.1 Fetch current user profile (protected)
      try {
        const userRes = await fetch('/api/auth/me', { headers });
        if (userRes.ok) {
          const uData = await userRes.json();
          if (uData && uData.user) {
            setUser(uData.user);
            setCurrentUser(uData.user);
          }
        }
      } catch (e) {
        // Fallback to local storage user
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    triggerRecruitsRefresh();
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
      triggerRecruitsRefresh();
      showToast('تم حذف ملف المجند بنجاح');
    } catch (err) {
      showToast('خطأ أثناء الحذف: ' + err.message, 'error');
    }
  };

  // Listen for window resize if not explicitly locked by user
  useEffect(() => {
    const handleResize = () => {
      const saved = localStorage.getItem('security_eye_view_mode');
      if (!saved) {
        setIsMobileMode(detectMobile());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initial Application Launch / Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Not logged in — show login page
  if (!loggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Dedicated Mobile-Optimized Application
  if (isMobileMode) {
    return (
      <div dir="rtl" className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-900'} font-sans`}>
        {toast && (
          <Toast
            key={toast.key}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <MobileApp
          currentUser={currentUser}
          activeBatch={activeBatch}
          batches={batches}
          stats={stats}
          networkInfo={networkInfo}
          onRefresh={loadInitialData}
          onLogout={handleLogout}
          onSwitchToDesktop={() => {
            localStorage.setItem('security_eye_view_mode', 'desktop');
            setIsMobileMode(false);
          }}
          onOpenNetwork={() => setShowNetworkModal(true)}
          onOpenBatches={() => setShowBatchesModal(true)}
          onOpenBackup={() => setShowBackupModal(true)}
          onOpenUsers={() => setShowUsersModal(true)}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          onOpenAuditLogs={() => setShowAuditLogModal(true)}
          showToast={showToast}
        />

        {/* Batches Management Modal (if invoked from mobile) */}
        {showBatchesModal && (
          <BatchesModal
            batches={batches}
            activeBatch={activeBatch}
            onSetActiveBatch={(b) => setActiveBatch(b)}
            onClose={() => setShowBatchesModal(false)}
            onRefresh={loadInitialData}
          />
        )}

        {/* Wi-Fi & Local Network Sync Modal (if invoked from mobile) */}
        {showNetworkModal && (
          <NetworkModal
            networkInfo={networkInfo}
            onClose={() => setShowNetworkModal(false)}
          />
        )}

        {/* Backup & External Drive Management Modal (if invoked from mobile) */}
        {showBackupModal && (
          <BackupManagerModal
            isOpen={showBackupModal}
            onClose={() => setShowBackupModal(false)}
          />
        )}

        {/* Users & Permissions Management Modal (Admin Only - if invoked from mobile) */}
        {showUsersModal && (
          <UsersModal
            isOpen={showUsersModal}
            onClose={() => setShowUsersModal(false)}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {/* User Change Password Modal (if invoked from mobile) */}
        {showChangePasswordModal && (
          <ChangePasswordModal
            isOpen={showChangePasswordModal}
            onClose={() => setShowChangePasswordModal(false)}
            onSuccess={(msg) => showToast(msg, 'success')}
          />
        )}

        {/* System Audit Log Modal (if invoked from mobile) */}
        {showAuditLogModal && (
          <SystemAuditLogModal
            onClose={() => setShowAuditLogModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div dir="rtl" className={`min-h-screen bg-slate-100 dark:bg-darkslate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 ${printRecruit ? 'report-printing-mode' : ''}`}>
      
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
          currentUser={currentUser}
          onOpenUsers={() => setShowUsersModal(true)}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          onOpenKiosk={() => setView('kiosk')}
          onOpenBatches={() => setShowBatchesModal(true)}
          onOpenNetwork={() => setShowNetworkModal(true)}
          onOpenBackup={() => setShowBackupModal(true)}
          onOpenAuditLogs={() => setShowAuditLogModal(true)}
          onOpenAiChat={() => setIsChatOpen(true)}
          onSwitchToMobile={() => {
            localStorage.setItem('security_eye_view_mode', 'mobile');
            setIsMobileMode(true);
          }}
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
            currentUser={currentUser}
            refreshTrigger={recruitsRefreshTrigger}
            onOpenKiosk={() => setView('kiosk')}
            onSelectRecruit={(r, edit = false) => {
              setSelectedRecruit(r);
              setEditModeForSelected(edit);
            }}
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
          currentUser={currentUser}
          initialEditMode={editModeForSelected}
          onClose={() => {
            setSelectedRecruit(null);
            setEditModeForSelected(false);
          }}
          onPrint={(r) => {
            setSelectedRecruit(null);
            setPrintRecruit(r);
          }}
          onDelete={handleDeleteRecruit}
          onUpdate={(updated) => {
            setSelectedRecruit(updated);
            triggerRecruitsRefresh();
            showToast('تم حفظ تعديلات ملف المجند والوسائط بنجاح');
          }}
        />
      )}

      {/* Official A4 Printable Examination Report */}
      {printRecruit && (
        <OfficialReport
          recruit={printRecruit}
          currentUser={currentUser}
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

      {/* Users & Permissions Management Modal (Admin Only) */}
      {showUsersModal && (
        <UsersModal
          isOpen={showUsersModal}
          onClose={() => setShowUsersModal(false)}
          currentUser={currentUser}
          showToast={showToast}
        />
      )}

      {/* User Personal Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={(msg) => showToast(msg, 'success')}
        />
      )}

      {/* System Audit Log Modal (Desktop) */}
      {showAuditLogModal && (
        <SystemAuditLogModal
          onClose={() => setShowAuditLogModal(false)}
        />
      )}

      {/* AI Data Assistant Sliding Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeBatch={activeBatch}
      />

      {/* System Footer Branding */}
      <footer className="w-full text-center py-2.5 bg-white/90 dark:bg-zinc-950/90 border-t border-slate-200 dark:border-zinc-850 no-print text-[11px] text-slate-600 dark:text-slate-400 font-mono flex items-center justify-center gap-2 flex-wrap">
        <span className="font-bold text-slate-900 dark:text-white">SECURITY EYE</span>
        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          VER 02.3
        </span>
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
