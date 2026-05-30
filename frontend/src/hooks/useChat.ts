import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatResponse, Account } from '../types';

export function useChat(accounts: Account[]) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;

    const { data } = await supabase
      .from('conversations')
      .select('role, content, created_at')
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true });

    if (data) {
      const chatMsgs = data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      setMessages(chatMsgs);
    }
    setHistoryLoaded(true);
  }, [historyLoaded]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendMessage = useCallback(async (text: string): Promise<ChatResponse | null> => {
    if (!text.trim()) return null;

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const { data: json, error: invokeError } = await supabase.functions.invoke<ChatResponse>('chat', {
        body: {
          text,
          accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type })),
        },
      });

      if (invokeError || !json) {
        const errorMsg = invokeError?.message || 'Error desconocido';
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }]);
        setLoading(false);
        return { type: 'error', message: errorMsg };
      }

      setMessages(prev => [...prev, { role: 'assistant', content: json.message }]);
      setLoading(false);
      return json;
    } catch (err) {
      const errorMsg = `Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      setLoading(false);
      return { type: 'error', message: errorMsg };
    }
  }, [accounts]);

  const clearHistory = useCallback(async () => {
    try {
      await supabase
        .from('conversations')
        .delete()
        .in('role', ['user', 'assistant']);
      setMessages([]);
      setHistoryLoaded(false);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  }, []);

  return { messages, loading, sendMessage, clearHistory };
}