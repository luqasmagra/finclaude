
import { LogOut, Upload, LayoutDashboard, MessageSquare, Menu, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

interface HeaderProps {
  currentTab: 'dashboard' | 'chat' | 'transactions';
  onTabChange: (tab: 'dashboard' | 'chat' | 'transactions') => void;
  onImport: () => void;
  onSyncMP: () => void;
  syncingMP?: boolean;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  mobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

export function Header({ currentTab, onTabChange, onImport, onSyncMP, syncingMP, onToggleSidebar, sidebarOpen, mobileMenuOpen, onMobileMenuToggle }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { addToast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    addToast({
      type: 'info',
      title: 'Sesión cerrada',
      message: 'Has cerrado sesión correctamente.',
    });
  };

  const navItems = [
    { tab: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { tab: 'chat' as const, label: 'Chat IA', icon: MessageSquare },
  ];

  return (
    <header
      className="sticky top-0 z-[var(--z-sticky)] flex items-center justify-between px-4 lg:px-6 py-3.5 glass border-b"
      style={{ borderColor: 'var(--border-subtle)' }}
      role="banner"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            className="lg:hidden p-2.5 text-[#71717a] hover:text-[#fafafa] rounded-xl hover:bg-[#222228] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Cerrar panel' : 'Abrir panel'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)' }}
            aria-hidden="true"
          >
            <span className="text-lg">💰</span>
          </div>
          <h1 className="text-lg font-bold text-[#fafafa]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Finanzas
          </h1>
        </div>
      </div>

      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-2.5 text-[#71717a] hover:text-[#fafafa] rounded-xl hover:bg-[#222228] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
        onClick={onMobileMenuToggle}
        aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-nav"
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop navigation */}
      <nav
        className="hidden lg:flex items-center gap-1 p-1.5 rounded-xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        aria-label="Navegación principal"
      >
        {navItems.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentTab === tab
                ? 'text-black'
                : 'text-[#71717a] hover:text-[#a1a1aa]'
            }`}
            style={currentTab === tab ? { background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' } : {}}
            aria-pressed={currentTab === tab}
            aria-current={currentTab === tab ? 'page' : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {/* Desktop actions */}
      <div className="hidden lg:flex items-center gap-3">
        <button
          onClick={onSyncMP}
          disabled={syncingMP}
          className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40"
        >
          <RefreshCw size={16} className={syncingMP ? 'animate-spin' : ''} aria-hidden="true" />
          Sync MP
        </button>

        <button
          onClick={onImport}
          className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2"
        >
          <Upload size={16} aria-hidden="true" />
          Importar
        </button>

        <div className="h-6 w-px" style={{ background: 'var(--border-subtle)' }} aria-hidden="true" />

        <span className="text-xs text-[#71717a] max-w-[180px] truncate" title={user?.email || ''}>
          {user?.email}
        </span>

        <button
          onClick={handleSignOut}
          className="p-2.5 text-[#71717a] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}