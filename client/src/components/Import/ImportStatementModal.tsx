import { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAccountsContext } from '../../context/AccountsContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

export function ImportStatementModal({ isOpen, onClose, onImportComplete }: ImportStatementModalProps) {
  const { accounts } = useAccountsContext();
  const { addToast } = useToast();
  const [step, setStep] = useState<'select' | 'preview' | 'confirm'>('select');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [text, setText] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const accountRef = useRef<HTMLSelectElement>(null);

  const handleClose = useCallback(() => {
    setStep('select');
    setSelectedAccount('');
    setText('');
    setParsedTransactions([]);
    setError('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => accountRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleParse = async () => {
    if (!selectedAccount || !text.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: json, error: invokeError } = await supabase.functions.invoke('import-statement', {
        body: { text, account_id: selectedAccount },
      });

      if (invokeError || !json) {
        setError(invokeError?.message || 'Error al procesar');
        return;
      }

      setParsedTransactions(json.transactions);
      setStep('preview');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (parsedTransactions.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const { data: json, error: invokeError } = await supabase.functions.invoke('import-statement', {
        body: { confirm: true, account_id: selectedAccount, transactions: parsedTransactions },
      });

      if (invokeError || !json) {
        setError(invokeError?.message || 'Error al importar');
        return;
      }

      addToast({
        type: 'success',
        title: 'Importación exitosa',
        message: `Se importaron ${parsedTransactions.length} transacciones.`,
      });
      onImportComplete();
      handleClose();
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl animate-fade-in-scale max-h-[90vh] flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 id="import-title" className="text-lg font-semibold text-[#fafafa]" style={{ fontFamily: 'var(--font-display)' }}>
            Importar extracto
          </h2>
          <button
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label htmlFor="import-account" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Cuenta
                </label>
                <select
                  id="import-account"
                  ref={accountRef}
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="input w-full px-4 py-3 text-sm"
                >
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="import-text" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Pegá tu extracto
                </label>
                <textarea
                  id="import-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Pegá el contenido de tu extracto bancario aquí..."
                  className="input w-full h-48 px-4 py-3 text-sm resize-none font-mono"
                  aria-describedby={error ? 'import-error' : undefined}
                />
              </div>

              {error && (
                <div
                  id="import-error"
                  className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
                  style={{ color: 'var(--negative)', background: 'var(--negative-bg)' }}
                  role="alert"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--positive)' }} aria-hidden="true" />
                <span>
                  Se detectaron{' '}
                  <span className="font-medium" style={{ color: 'var(--accent)' }}>{parsedTransactions.length}</span>
                  {' '}transacciones. Verificá que sean correctas antes de importar.
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
                <table className="w-full text-sm" aria-label="Vista previa de transacciones">
                  <thead className="sticky top-0" style={{ background: 'var(--bg-base)' }}>
                    <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
                      <th className="px-4 py-2 font-medium">Fecha</th>
                      <th className="px-4 py-2 font-medium">Descripción</th>
                      <th className="px-4 py-2 font-medium text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {parsedTransactions.map((t, i) => (
                      <tr
                        key={i}
                        className="transition-colors"
                        style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined, color: 'var(--text-primary)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <td className="px-4 py-2">{t.date}</td>
                        <td className="px-4 py-2">{t.description}</td>
                        <td className="px-4 py-2 text-right font-medium" style={{ color: t.amount >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                          {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div
                  id="import-error"
                  className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
                  style={{ color: 'var(--negative)', background: 'var(--negative-bg)' }}
                  role="alert"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {step === 'select' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost flex-1 py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleParse}
                disabled={loading || !selectedAccount || !text.trim()}
                className="btn-accent flex-1 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} aria-hidden="true" />
                    <span>Previsualizar</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('select')}
                className="btn-ghost flex-1 py-3 text-sm"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="btn-accent flex-1 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <span>Confirmar importación</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
