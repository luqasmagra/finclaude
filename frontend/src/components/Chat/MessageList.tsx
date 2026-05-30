import { useEffect, useRef, memo } from 'react';
import { Bot, User as UserIcon } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { ChatMessage } from '../../types';

marked.setOptions({ breaks: true, gfm: true });

const MarkdownMessage = memo(({ content }: { content: string }) => (
  <div
    className="prose prose-invert prose-sm max-w-none"
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content) as string) }}
  />
));

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
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
  );
}
