import { useState, useMemo } from 'react';
import { useTransactionsContext } from '../../context/TransactionsContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatMoney, formatDate } from '../../utils/formatters';
import { Trash2, Pencil, Search, ArrowUpDown } from 'lucide-react';
import { ConfirmDialog } from '../UI/ConfirmDialog';

export function TransactionsPage() {
  const { transactions, refetch } = useTransactionsContext();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; description: string } | null>(null);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.categories?.name?.toLowerCase().includes(searchLower) ||
        tx.amount.toString().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return filtered;
  }, [transactions, search, sortBy, sortOrder]);

  const handleDelete = async (id: string, _description: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      addToast({
        type: 'success',
        title: 'Transacción eliminada',
        message: 'La transacción fue eliminada exitosamente.',
      });
      await refetch();
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar la transacción.',
      });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8e8f0] mb-2">Transacciones</h1>
        <p className="text-sm text-[#6b6b80]">
          {filteredTransactions.length} de {transactions.length} transacciones
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción, categoría..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#14141e] border border-[#252535] rounded-xl text-[#e8e8f0] placeholder-[#6b6b80] outline-none focus:border-[#7c6af7] focus:ring-2 focus:ring-[rgba(124,106,247,0.15)] transition-all text-sm"
            aria-label="Buscar transacciones"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleSort('date')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-all ${
              sortBy === 'date'
                ? 'bg-[#7c6af7] text-white border-[#7c6af7]'
                : 'bg-[#14141e] text-[#6b6b80] border-[#252535] hover:border-[#6b6b80]'
            }`}
            aria-pressed={sortBy === 'date'}
            aria-label="Ordenar por fecha"
          >
            Fecha
            {sortBy === 'date' && (
              <ArrowUpDown size={14} aria-hidden="true" />
            )}
          </button>

          <button
            onClick={() => toggleSort('amount')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-all ${
              sortBy === 'amount'
                ? 'bg-[#7c6af7] text-white border-[#7c6af7]'
                : 'bg-[#14141e] text-[#6b6b80] border-[#252535] hover:border-[#6b6b80]'
            }`}
            aria-pressed={sortBy === 'amount'}
            aria-label="Ordenar por monto"
          >
            Monto
            {sortBy === 'amount' && (
              <ArrowUpDown size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Transactions list */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-[#14141e] border border-dashed border-[#252535] rounded-xl">
          <p className="text-[#6b6b80]">
            {search ? 'No se encontraron transacciones' : 'No hay transacciones aún'}
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="Lista de transacciones">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 sm:p-4 bg-[#14141e] border border-[#252535] rounded-xl hover:border-[#6b6b80] transition-all group"
              role="listitem"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#252535] flex items-center justify-center flex-shrink-0 text-lg">
                  {tx.categories?.icon || '📦'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#e8e8f0] truncate">
                    {tx.description || 'Sin descripción'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[#6b6b80] mt-0.5">
                    <span>{formatDate(tx.date)}</span>
                    <span>·</span>
                    <span>{tx.accounts?.name || '—'}</span>
                    {tx.categories && (
                      <>
                        <span>·</span>
                        <span>{tx.categories.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-sm font-semibold ${
                  tx.amount < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'
                }`}>
                  {tx.amount < 0 ? '' : '+'}{formatMoney(tx.amount)}
                </span>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1.5 text-[#6b6b80] hover:text-[#e8e8f0] hover:bg-[#252535] rounded-lg transition-all min-w-[32px] min-h-[32px] flex items-center justify-center"
                    aria-label={`Editar ${tx.description || 'transacción'}`}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: tx.id, description: tx.description || '' })}
                    disabled={deletingId === tx.id}
                    className="p-1.5 text-[#6b6b80] hover:text-[#f87171] hover:bg-[#f8717115] rounded-lg transition-all min-w-[32px] min-h-[32px] flex items-center justify-center disabled:opacity-50"
                    aria-label={`Eliminar ${tx.description || 'transacción'}`}
                    title="Eliminar"
                  >
                    {deletingId === tx.id ? (
                      <span className="spinner" aria-hidden="true"></span>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar transacción"
        message={`¿Eliminar "${confirmDelete?.description || 'esta transacción'}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id, confirmDelete.description)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
