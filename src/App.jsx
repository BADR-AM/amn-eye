import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import KioskForm from './components/KioskForm';
import MediaCapture from './components/MediaCapture';
import RecruitModal from './components/RecruitModal';
import OfficialReport from './components/OfficialReport';
import BatchesModal from './components/BatchesModal';
import NetworkModal from './components/NetworkModal';
import ChatPanel from './components/ChatPanel';
import LoginPage from './components/LoginPage';
import Toast from './components/Toast';
import { isLoggedIn as checkLoggedIn, setToken, clearToken, authHeaders } from './utils/auth';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(checkLoggedIn());
  const [view, setView] = useState('dashboard');
  const [selectedRecruit, setSelectedRecruit] = useState(null);
  const [printRecruit, setPrintRecruit] = useState(null);
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [stats, setStats] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [kioskFormData, setKioskFormData] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const handleLogin = (token) => { setToken(token); setLoggedIn(true); };
  const handleLogout = () => {
    clearToken();
    setLoggedIn(false);
    setView('dashboard');
  };

  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  const loadInitialData = async () => {
    try {
      const headers = authHeaders();
      const batchesRes = await fetch('/api/batches');
      if (batchesRes.ok) {
        const bData = await batchesRes.json();
        setBatches(bData);
        setActiveBatch(bData.find(b => b.active === 1) || bData[0]);
      }

      const statsRes = await fetch('/api/stats', { headers });
      if (statsRes.ok) setStats(await statsRes.json());
      else if (statsRes.status === 401) { handleLogout(); return; }

      const netRes = await fetch('/api/network-info');
      if (netRes.ok) setNetworkInfo(await netRes.json());
    } catch (err) {
      console.error('Error connecting to backend:', err);
    }
  };

  useEffect(() => { if (loggedIn) loadInitialData(); }, [loggedIn]);

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

  const handleKioskComplete = (formData) => { setKioskFormData(formData); setView('media'); };
  const handleSaveSuccess = (savedRecruit) => {
    setView('dashboard');
    setKioskFormData(null);
    loadInitialData();
    setSelectedRecruit(savedRecruit);
    showToast('تم تسجيل المجند بنجاح');
  };

  const handleDeleteRecruit = async (recruitId) => {
    try {
      const res = await fetch(`/api/recruits/${recruitId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('فشل الحذف');
      if (selectedRecruit?.id === recruitId) setSelectedRecruit(null);
      loadInitialData();
      showToast('تم حذف ملف المجند بنجاح');
    } catch (err) {
      showToast('خطأ أثناء الحذف: ' + err.message, 'error');
    }
  };

  if (!loggedIn) return <LoginPage onLogin={handleLogin} />;

  const appActions = {
    onDashboard: () => setView('dashboard'),
    onRegister: () => setView('kiosk'),
    onOpenBatches: () => setShowBatchesModal(true),
    onOpenNetwork: () => setShowNetworkModal(true),
    onOpenAiChat: () => setIsChatOpen(true),
    onLogout: handleLogout,
  };

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-slate-100 flex font-sans">
      {view === 'dashboard' && <Sidebar activeBatch={activeBatch} {...appActions} />}

      <div className="flex-1 min-w-0 flex flex-col">
        {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {view === 'dashboard' && (
          <Header
            activeBatch={activeBatch}
            onOpenKiosk={appActions.onRegister}
            onOpenBatches={appActions.onOpenBatches}
            onOpenNetwork={appActions.onOpenNetwork}
            onOpenAiChat={appActions.onOpenAiChat}
            networkInfo={networkInfo}
            onRefresh={loadInitialData}
            onLogout={handleLogout}
          />
        )}

        {view === 'dashboard' && (
          <main className="flex-1 min-w-0">
            <Dashboard
              stats={stats} batches={batches} activeBatch={activeBatch}
              onOpenKiosk={appActions.onRegister}
              onSelectRecruit={setSelectedRecruit}
              onPrintRecruit={setPrintRecruit}
              onDeleteRecruit={handleDeleteRecruit}
              onOpenAiChat={appActions.onOpenAiChat}
              onRefresh={loadInitialData}
            />
          </main>
        )}

        {view === 'kiosk' && (
          <KioskForm activeBatch={activeBatch} onComplete={handleKioskComplete}
            onCancel={() => { setKioskFormData(null); setView('dashboard'); }}
            initialData={kioskFormData} />
        )}

        {view === 'media' && kioskFormData && (
          <MediaCapture formData={kioskFormData} onSaveSuccess={handleSaveSuccess}
            onBack={() => setView('kiosk')} onCancel={() => setView('dashboard')} />
        )}
      </div>

      {selectedRecruit && <RecruitModal recruit={selectedRecruit} onClose={() => setSelectedRecruit(null)}
        onPrint={(r) => { setSelectedRecruit(null); setPrintRecruit(r); }} onDelete={handleDeleteRecruit} />}

      {printRecruit && <OfficialReport recruit={printRecruit} onClose={() => setPrintRecruit(null)} />}

      {showBatchesModal && <BatchesModal batches={batches} activeBatch={activeBatch}
        onSetActiveBatch={setActiveBatch} onClose={() => setShowBatchesModal(false)} onRefresh={loadInitialData} />}

      {showNetworkModal && <NetworkModal networkInfo={networkInfo} onClose={() => setShowNetworkModal(false)} />}

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} activeBatch={activeBatch} />
    </div>
  );
}
