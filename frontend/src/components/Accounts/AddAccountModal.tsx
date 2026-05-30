import { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import { X, Wallet, Landmark, Banknote } from 'lucide-react';
import { useAccountsContext } from '../../context/AccountsContext';
import { useToast } from '../../context/ToastContext';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AccountType = 'digital' | 'bank' | 'cash';
type Currency = 'ARS' | 'USD';

export function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const { createAccount } = useAccountsContext();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('digital');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    setName('');
    setBalance('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await createAccount({
        name: name.trim(),
        type,
        currency,
        balance: parseFloat(balance) || 0,
      });

      if (!error) {
        addToast({
          type: 'success',
          title: 'Cuenta creada',
          message: `La cuenta "${name.trim()}" fue creada exitosamente.`,
        });
        setName('');
        setBalance('');
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'No se pudo crear la cuenta.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const typeOptions: { value: AccountType; label: string; icon: typeof Wallet }[] = [
    { value: 'digital', label: 'Digital', icon: Wallet },
    { value: 'bank', label: 'Banco', icon: Landmark },
    { value: 'cash', label: 'Efectivo', icon: Banknote },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)] animate-fade-in p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-account-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in-scale"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="add-account-title" className="text-lg font-semibold text-[#fafafa]" style={{ fontFamily: 'var(--font-display)' }}>
            Nueva cuenta
          </h2>
          <button
            ref={closeRef}
            onClick={handleClose}
            className="p-2 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Nombre */}
          <div className="mb-4">
            <label htmlFor="account-name" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Nombre
            </label>
            <input
              id="account-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mercado Pago"
              className="input w-full px-4 py-3 text-sm"
              required
              autoComplete="off"
            />
          </div>

          {/* Tipo */}
          <div className="mb-4">
            <span className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Tipo de cuenta
            </span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de cuenta">
              {typeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all text-xs font-medium"
                  style={
                    type === value
                      ? { background: 'var(--accent-alpha)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }
                      : { background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }
                  }
                  role="radio"
                  aria-checked={type === value}
                  aria-label={label}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Moneda y Balance */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="account-currency" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Moneda
              </label>
              <select
                id="account-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="input w-full px-4 py-3 text-sm"
              >
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="USD">USD - Dólar Estadounidense</option>
              </select>
            </div>
            <div>
              <label htmlFor="account-balance" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Balance inicial
              </label>
              <input
                id="account-balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="input w-full px-4 py-3 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn-ghost flex-1 py-3 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-accent flex-1 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
