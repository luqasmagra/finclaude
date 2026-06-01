import { useState } from 'react';
import { Bot, Trash2 } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAccountsContext } from '../../context/AccountsContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatPage({ onTransactionCreated }: { onTransactionCreated?: () => void }) {
  const { accounts } = useAccountsContext();
  const { addToast } = useToast();
  const { messages, loading, sendMessage, clearHistory } = useChat(accounts);
  const [input, setInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    try {
      const response = await sendMessage(text);
      if (response?.type === 'transaction' && onTransactionCreated) {
        onTransactionCreated();
        addToast({
          type: 'success',
          title: 'Transacción registrada',
          message: 'La transacción fue guardada exitosamente.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo enviar el mensaje.',
      });
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    addToast({
      type: 'info',
      title: 'Historial borrado',
      message: 'El historial del chat fue eliminado.',
    });
    setShowClearConfirm(false);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">

      {/* Chat header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b relative z-10 flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)' }}
            aria-hidden="true"
          >
            <Bot size={20} className="text-black" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#fafafa]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Asistente Financiero</h2>
            <p className="text-xs text-[#71717a]">IA lista para ayudarte</p>
          </div>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="p-2.5 text-[#71717a] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] rounded-xl transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Borrar historial del chat"
          title="Borrar historial"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Borrar historial"
        message="¿Borrar todo el historial del chat? Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
      />

      <MessageList messages={messages} loading={loading} />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        isLoading={loading}
      />
    </div>
  );
}
