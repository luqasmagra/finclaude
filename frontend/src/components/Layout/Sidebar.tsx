import { useState } from 'react';
import { Plus, Wallet, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { useAccountsContext } from '../../context/AccountsContext';
import { useTransactionsContext } from '../../context/TransactionsContext';
import { formatMoney, formatDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../UI/ConfirmDialog';

interface SidebarProps {
  onAddAccount: () => void;
  currentTab: 'dashboard' | 'chat' | 'transactions';
  onTabChange: (tab: 'dashboard' | 'chat' | 'transactions') => void;
}

export function Sidebar({ onAddAccount, currentTab: _currentTab, onTabChange: _onTabChange }: SidebarProps) {
  const { accounts, loading: accountsLoading, getTotalBalance, deleteAccount } = useAccountsContext();
  const { transactions, loading: txLoading } = useTransactionsContext();
  const { addToast } = useToast();
  const [accountsExpanded, setAccountsExpanded] = useState(true);
  const [transactionsExpanded, setTransactionsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteAccount = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      await deleteAccount(id);
      addToast({
        type: 'success',
        title: 'Cuenta eliminada',
        message: `La cuenta "${name}" fue eliminada.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar la cuenta.',
      });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
    <aside
      className="w-[288px] flex-shrink-0 overflow-hidden h-full"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      aria-label="Panel lateral"
    >
      <div className="h-full flex flex-col">
        <div className="p-5 space-y-6 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full">
            {/* Accounts section */}
            <section aria-labelledby="accounts-heading">
              <div className="flex items-center justify-between mb-4">
                <button
                  id="accounts-heading"
                  onClick={() => setAccountsExpanded(!accountsExpanded)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#a1a1aa] transition-colors"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  aria-expanded={accountsExpanded}
                >
                  {accountsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Cuentas
                </button>
                <span className="text-xs text-[#52525b]">{accounts.length}</span>
              </div>

              {accountsExpanded && (
                <div className="space-y-3">
                  {accountsLoading ? (
                    <div className="text-sm text-[#71717a]" role="status">Cargando...</div>
                  ) : accounts.length === 0 ? (
                    <p className="text-sm text-[#71717a] mb-3">Sin cuentas aún</p>
                  ) : (
                    accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="card p-4 group cursor-pointer"
                        style={{ borderColor: 'var(--border-subtle)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                      >
                        <div className="flex items-start justify-between mb-2 min-w-0">
                          <div className="flex items-center gap-2.5 font-medium text-sm text-[#fafafa] min-w-0">
                            <span className="text-lg" aria-hidden="true">💳</span>
                            <span className="truncate">{acc.name}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 text-[#71717a] hover:text-[#fafafa] rounded-lg hover:bg-[#222228] transition-all min-w-[28px] min-h-[28px] flex items-center justify-center"
                              aria-label={`Editar cuenta ${acc.name}`}
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: acc.id, name: acc.name }); }}
                              disabled={deletingId === acc.id}
                              className="p-1.5 text-[#71717a] hover:text-[#ef4444] rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-all min-w-[28px] min-h-[28px] flex items-center justify-center disabled:opacity-50"
                              aria-label={`Eliminar cuenta ${acc.name}`}
                              title="Eliminar"
                            >
                              {deletingId === acc.id ? (
                                <span className="spinner" aria-hidden="true" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className={`text-xl font-bold ${acc.balance < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {formatMoney(acc.balance, acc.currency)}
                        </div>
                        <div className="text-xs text-[#52525b] mt-1.5 capitalize flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>{acc.type}</span>
                          <span>{acc.currency}</span>
                        </div>
                      </div>
                    ))
                  )}

                  <button
                    onClick={onAddAccount}
                    className="w-full py-3 text-sm text-[#71717a] border border-dashed rounded-xl hover:border-[#f59e0b] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.05)] transition-all flex items-center justify-center gap-2"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Agregar cuenta
                  </button>
                </div>
              )}
            </section>

            {/* Recent transactions section */}
            <section aria-labelledby="transactions-heading" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  id="transactions-heading"
                  onClick={() => setTransactionsExpanded(!transactionsExpanded)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#a1a1aa] transition-colors"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  aria-expanded={transactionsExpanded}
                >
                  {transactionsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Últimas transacciones
                </button>
              </div>

              {transactionsExpanded && (
                <div className="space-y-2">
                  {txLoading ? (
                    <div className="text-sm text-[#71717a]" role="status">Cargando...</div>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-[#71717a]">Sin transacciones</p>
                  ) : (
                    transactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-2 p-3 rounded-xl transition-all"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className="text-sm font-medium text-[#fafafa] truncate">
                            {tx.description || '—'}
                          </span>
                          <span className="text-xs text-[#52525b] truncate">
                            {formatDate(tx.date)} · {tx.accounts?.name || '—'}{tx.categories ? ` · ${tx.categories.icon} ${tx.categories.name}` : ''}
                          </span>
                        </div>
                        <span
                          className="text-sm font-semibold whitespace-nowrap ml-2 px-2 py-1 rounded-lg flex-shrink-0"
                          style={
                            tx.amount < 0
                              ? { color: 'var(--negative)', background: 'var(--negative-bg)' }
                              : { color: 'var(--positive)', background: 'var(--positive-bg)' }
                          }
                        >
                          {tx.amount < 0 ? '' : '+'}{formatMoney(tx.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Total balance */}
        <div
          className="flex items-center gap-2.5 text-sm font-semibold text-[#a1a1aa] px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          aria-label={`Balance total: ${formatMoney(getTotalBalance())}`}
        >
          <div className="p-2 rounded-lg" style={{ background: 'var(--accent-alpha)' }}>
            <Wallet size={16} className="text-[#f59e0b]" aria-hidden="true" />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Total: {formatMoney(getTotalBalance())}
          </span>
        </div>
      </div>
      </aside>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar cuenta"
        message={`¿Eliminar la cuenta "${confirmDelete?.name}"? Esta acción no se puede deshacer y eliminará todas sus transacciones asociadas.`}
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && handleDeleteAccount(confirmDelete.id, confirmDelete.name)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}