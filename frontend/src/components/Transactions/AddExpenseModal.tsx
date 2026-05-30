import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ReceiptText, X } from 'lucide-react';
import { useAccountsContext } from '../../context/AccountsContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { Category } from '../../types';
import { formatMoney } from '../../utils/formatters';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: () => Promise<void>;
}

type Step = 'form' | 'confirm';

function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

export function AddExpenseModal({ isOpen, onClose, onExpenseCreated }: AddExpenseModalProps) {
  const { accounts } = useAccountsContext();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [loading, setLoading] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accounts, accountId],
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  const parsedAmount = Number.parseFloat(amount);
  const canContinue = Boolean(Number.isFinite(parsedAmount) && parsedAmount > 0 && description.trim() && accountId && date);

  const resetForm = useCallback(() => {
    setStep('form');
    setAmount('');
    setDescription('');
    setAccountId(accounts[0]?.id ?? '');
    setCategoryId('');
    setDate(todayIsoDate());
    setLoading(false);
  }, [accounts]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) return;

    setAccountId((current) => current || accounts[0]?.id || '');
    setTimeout(() => amountRef.current?.focus(), 100);
  }, [accounts, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color, icon')
        .order('name');

      if (error) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudieron cargar las categorías.',
        });
        return;
      }

      setCategories(data || []);
    };

    loadCategories();
  }, [addToast, isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canContinue) return;
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!canContinue) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        account_id: accountId,
        amount: -Math.abs(parsedAmount),
        description: description.trim(),
        category_id: categoryId || null,
        date,
        source: 'manual',
      });

      if (error) throw error;

      await onExpenseCreated();
      addToast({
        type: 'success',
        title: 'Gasto registrado',
        message: `${description.trim()} por ${formatMoney(parsedAmount, selectedAccount?.currency || 'ARS')}`,
      });
      handleClose();
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo registrar el gasto.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)] animate-fade-in p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-expense-title"
      onClick={(event) => event.target === event.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fade-in-scale"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        role="document"
      >
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[#09090b]"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }}
              aria-hidden="true"
            >
              <ReceiptText size={22} />
            </div>
            <div>
              <h2 id="add-expense-title" className="text-lg font-semibold text-[#fafafa]" style={{ fontFamily: 'var(--font-display)' }}>
                Nuevo gasto
              </h2>
              <p className="text-xs text-[#71717a] mt-1">
                {step === 'form' ? 'Completá los datos del movimiento' : 'Revisá antes de confirmar'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center text-[#71717a] hover:text-[#fafafa] hover:bg-[#222228]"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="expense-amount" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Monto
                </label>
                <input
                  id="expense-amount"
                  ref={amountRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="input w-full px-4 py-3 text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="expense-date" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Fecha
                </label>
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="input w-full px-4 py-3 text-sm"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="expense-description" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Descripción
              </label>
              <input
                id="expense-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ej: Supermercado"
                className="input w-full px-4 py-3 text-sm"
                autoComplete="off"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="expense-account" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Cuenta
                </label>
                <select
                  id="expense-account"
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  className="input w-full px-4 py-3 text-sm"
                  required
                >
                  {accounts.length === 0 ? (
                    <option value="">No hay cuentas</option>
                  ) : (
                    accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.currency}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="expense-category" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Categoría
                </label>
                <select
                  id="expense-category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="input w-full px-4 py-3 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={handleClose} className="btn-ghost flex-1 py-3 text-sm">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canContinue}
                className="btn-accent flex-1 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continuar</span>
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs uppercase tracking-wider text-[#71717a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Vas a registrar
              </p>
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h3 className="text-xl font-semibold text-[#fafafa] truncate">
                  {description.trim()}
                </h3>
                <span className="text-xl font-bold text-[#ef4444] whitespace-nowrap">
                  -{formatMoney(parsedAmount, selectedAccount?.currency || 'ARS')}
                </span>
              </div>

              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)' }}>
                  <dt className="text-xs text-[#71717a] mb-1">Cuenta</dt>
                  <dd className="text-[#fafafa]">{selectedAccount?.name || 'Sin cuenta'}</dd>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)' }}>
                  <dt className="text-xs text-[#71717a] mb-1">Categoría</dt>
                  <dd className="text-[#fafafa]">{selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Sin categoría'}</dd>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)' }}>
                  <dt className="text-xs text-[#71717a] mb-1">Fecha</dt>
                  <dd className="text-[#fafafa]">{date}</dd>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)' }}>
                  <dt className="text-xs text-[#71717a] mb-1">Origen</dt>
                  <dd className="text-[#fafafa]">Manual</dd>
                </div>
              </dl>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={loading}
                className="btn-ghost flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Editar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="btn-accent flex-1 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} className="relative z-10" aria-hidden="true" />
                    <span>Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
