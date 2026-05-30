import { useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (value === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className="relative z-20 flex-shrink-0 rounded-t-2xl"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
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
            disabled={isLoading || !value.trim()}
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
  );
}
