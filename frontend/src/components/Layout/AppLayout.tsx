import { lazy, Suspense, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAccountsContext } from '../../context/AccountsContext';
import { useTransactionsContext } from '../../context/TransactionsContext';
import { useToast } from '../../context/ToastContext';
import { LoginPage } from '../../pages/LoginPage';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, MessageSquare, Upload, LogOut, RefreshCw, Plus } from 'lucide-react';

const DashboardPage = lazy(() => import('../Dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const TransactionsPage = lazy(() => import('../Transactions/TransactionsPage').then((module) => ({ default: module.TransactionsPage })));
const ChatPage = lazy(() => import('../Chat/ChatPage').then((module) => ({ default: module.ChatPage })));
const AddAccountModal = lazy(() => import('../Accounts/AddAccountModal').then((module) => ({ default: module.AddAccountModal })));
const ImportStatementModal = lazy(() => import('../Import/ImportStatementModal').then((module) => ({ default: module.ImportStatementModal })));
const AddExpenseModal = lazy(() => import('../Transactions/AddExpenseModal').then((module) => ({ default: module.AddExpenseModal })));

function RouteFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="spinner" aria-hidden="true" />
    </div>
  );
}

export function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const { refetch: refetchAccounts } = useAccountsContext();
  const { refetch: refetchTransactions } = useTransactionsContext();
  const { addToast } = useToast();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'chat' | 'transactions'>('dashboard');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [syncingMP, setSyncingMP] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTransactionCreated = async () => {
    await Promise.all([refetchAccounts(), refetchTransactions()]);
  };

  const handleSyncMP = async () => {
    setSyncingMP(true);
    try {
      const { data, error } = await supabase.functions.invoke('mp-sync');
      if (error || !data) {
        addToast({
          type: 'error',
          title: 'Error de sync',
          message: error?.message || 'No se pudo sincronizar con Mercado Pago',
        });
        return;
      }
      if (data.error) {
        addToast({
          type: 'error',
          title: 'Error de sync',
          message: data.error,
        });
        return;
      }
      if (data.synced === 0) {
        addToast({
          type: 'info',
          title: 'Sync completa',
          message: data.message || 'No hay nuevos pagos para sincronizar',
        });
      } else {
        addToast({
          type: 'success',
          title: 'Sync exitosa',
          message: `${data.synced} pago(s) sincronizado(s)`,
        });
        await handleTransactionCreated();
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Error de sync',
        message: 'Error de conexión',
      });
    } finally {
      setSyncingMP(false);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        <div className="orb orb-1" aria-hidden="true" />
        <div className="orb orb-2" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="spinner spinner-lg" aria-hidden="true" />
          <span className="text-[#71717a]">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen flex flex-col relative" style={{ background: 'var(--bg-base)' }}>
      <div className="orb orb-1" aria-hidden="true" style={{ position: 'fixed', top: '-100px', right: '-100px', zIndex: 0 }} />
      <div className="orb orb-2" aria-hidden="true" style={{ position: 'fixed', bottom: '0', left: '-80px', zIndex: 0 }} />
      <div className="noise-overlay" aria-hidden="true" />

      <Header
        currentTab={currentTab}
        onTabChange={(tab) => { setCurrentTab(tab); setMobileMenuOpen(false); setSidebarOpen(false); }}
        onImport={() => setShowImport(true)}
        onAddExpense={() => setShowAddExpense(true)}
        onSyncMP={handleSyncMP}
        syncingMP={syncingMP}
        onToggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Mobile nav overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed top-[61px] bottom-0 left-0 right-0 z-[59] lg:hidden"
          style={{ background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile navigation drawer */}
      <div
        className={`
          fixed top-[61px] right-0 bottom-0 z-[60] lg:hidden
          w-[85vw] max-w-[320px]
          transform transition-transform duration-300
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)' }}
        role="navigation"
        aria-label="Menú móvil"
        aria-hidden={!mobileMenuOpen}
      >
        <nav className="flex flex-col p-4 gap-2 h-full overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#52525b] px-2 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Navegación
          </p>

          {[
            { tab: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
            { tab: 'chat' as const, label: 'Chat IA', icon: MessageSquare },
          ].map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              onClick={() => { setCurrentTab(tab); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
              style={
                currentTab === tab
                  ? { background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#09090b' }
                  : { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
              }
              aria-current={currentTab === tab ? 'page' : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}

          <div className="h-px my-2" style={{ background: 'var(--border-subtle)' }} />

          <button
            onClick={() => { setShowAddExpense(true); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', color: '#09090b' }}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar gasto
          </button>

          <div className="h-px my-2" style={{ background: 'var(--border-subtle)' }} />

          <button
            onClick={() => { handleSyncMP(); setMobileMenuOpen(false); }}
            disabled={syncingMP}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={16} className={syncingMP ? 'animate-spin' : ''} aria-hidden="true" />
            {syncingMP ? 'Sincronizando...' : 'Sync Mercado Pago'}
          </button>

          <button
            onClick={() => { setShowImport(true); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <Upload size={16} aria-hidden="true" />
            Importar extracto
          </button>

          <div className="flex-1" />

          <button
            onClick={() => { setMobileMenuOpen(false); signOut(); }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--negative-bg)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--negative)' }}
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </nav>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed top-[61px] bottom-0 left-0 right-0 z-[59] lg:hidden"
            style={{ background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:relative top-[61px] lg:top-auto bottom-0 left-0 z-[60] lg:z-auto
          w-[85vw] max-w-[320px] lg:w-auto overflow-y-auto overflow-x-hidden
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar
            onAddAccount={() => {
              setShowAddAccount(true);
              setSidebarOpen(false);
            }}
          />
        </div>

        <main className="flex-1 overflow-hidden relative">
          <Suspense fallback={<RouteFallback />}>
            {currentTab === 'dashboard' && <DashboardPage />}
            {currentTab === 'transactions' && <TransactionsPage />}
            {currentTab === 'chat' && (
              <ChatPage onTransactionCreated={handleTransactionCreated} />
            )}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        {showAddAccount && (
          <AddAccountModal
            isOpen={showAddAccount}
            onClose={() => setShowAddAccount(false)}
          />
        )}

        {showAddExpense && (
          <AddExpenseModal
            isOpen={showAddExpense}
            onClose={() => setShowAddExpense(false)}
            onExpenseCreated={handleTransactionCreated}
          />
        )}

        {showImport && (
          <ImportStatementModal
            isOpen={showImport}
            onClose={() => setShowImport(false)}
            onImportComplete={handleTransactionCreated}
          />
        )}
      </Suspense>
    </div>
  );
}
