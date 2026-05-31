import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('transactions')
      .select('*, accounts(name), categories(name, color, icon)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    setError(fetchError?.message ?? null);
    setTransactions(data || []);
    if (showLoading) setLoading(false);
  }, []);

  const refetch = useCallback(() => fetchTransactions(false), [fetchTransactions]);

  useEffect(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  return (
    <TransactionsContext.Provider value={{ transactions, loading, error, refetch }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactionsContext() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactionsContext must be used within a TransactionsProvider');
  }
  return context;
}