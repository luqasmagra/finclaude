import { useState, useRef, useEffect, memo, FormEvent, KeyboardEvent } from 'react';
import { Send, Bot, User as UserIcon, Trash2 } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAccountsContext } from '../../context/AccountsContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true,
});

const MarkdownMessage = memo(({ content }: { content: string }) => (
  <div
    className="prose prose-invert prose-sm max-w-none"
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content) as string) }}
  />
));

export function ChatPage({ onTransactionCreated }: { onTransactionCreated?: () => void }) {
  const { accounts } = useAccountsContext();
  const { addToast } = useToast();
  const { messages, loading, sendMessage, clearHistory } = useChat(accounts);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-5 sm:p-6 relative z-10"
        role="log"
        aria-live="polite"
        aria-label="Mensajes del chat"
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          {messages.length === 0 && (
            <div className="self-center text-center py-10 px-8 rounded-2xl animate-fade-in-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 12px 40px rgba(245, 158, 11, 0.25)' }}
                aria-hidden="true"
              >
                <Bot size={26} className="text-black" />
              </div>
              <p className="font-semibold mb-2 text-[#fafafa] text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>¡Hola! Soy tu asistente financiero</p>
              <p className="text-sm text-[#71717a] max-w-sm">
                Contame qué querés registrar o consultá sobre tus finanzas.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  "gasté $2000 en almuerzo"
                </span>
                <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  "¿cuánto gasté esta semana?"
                </span>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 animate-fade-in-up ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
              style={{ animationDelay: `${i * 0.03}s` }}
              role={msg.role === 'assistant' ? 'article' : undefined}
              aria-label={msg.role === 'user' ? 'Tu mensaje' : 'Respuesta del asistente'}
            >
              {msg.role === 'assistant' && (
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)' }}
                  aria-hidden="true"
                >
                  <Bot size={20} className="text-black" />
                </div>
              )}

              <div
                className={`max-w-lg px-5 py-4 ${
                  msg.role === 'user'
                    ? 'text-white rounded-2xl rounded-tr-md animate-fade-in-up'
                    : 'text-[#fafafa] rounded-2xl rounded-tl-md animate-fade-in-up'
                }`}
                style={
                  msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)' }
                    : { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }
                }
              >
                {msg.role === 'assistant' ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{msg.content}</p>
                )}
              </div>

              {msg.role === 'user' && (
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                  aria-hidden="true"
                >
                  <UserIcon size={20} className="text-[#a1a1aa]" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-4 self-start animate-fade-in-up" role="status" aria-label="Procesando mensaje">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)' }}
                aria-hidden="true"
              >
                <Bot size={20} className="text-black" />
              </div>
              <div className="px-5 py-4 rounded-2xl rounded-tl-md flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <span className="spinner" aria-hidden="true" />
                <span className="text-sm text-[#71717a]">Procesando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area — sticky at bottom */}
      <div
        className="relative z-20 flex-shrink-0 rounded-t-2xl"
        style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu mensaje..."
                className="input w-full px-4 py-3.5 resize-none min-h-[52px] max-h-[160px] text-sm"
                rows={1}
                aria-label="Mensaje para el asistente"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-accent px-5 py-3.5 flex items-center gap-2 flex-shrink-0"
              aria-label="Enviar mensaje"
            >
              <Send size={18} aria-hidden="true" />
              <span className="text-sm">Enviar</span>
            </button>
          </form>
          <p className="text-xs text-[#52525b] mt-2.5 text-center">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}