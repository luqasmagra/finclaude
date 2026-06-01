import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Account } from '../types';

interface AccountsContextType {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAccount: (account: Omit<Account, 'id' | 'created_at' | 'active'>) => Promise<{ error: Error | null }>;
  deleteAccount: (id: string) => Promise<{ error: Error | null }>;
  getTotalBalance: () => number;
  getBalanceByCurrency: () => Record<string, number>;
  getAccountsByCurrency: (currency: string) => Account[];
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('active', true)
      .order('name');
    setError(fetchError?.message ?? null);
    setAccounts(data || []);
    if (showLoading) setLoading(false);
  }, []);

  const refetch = useCallback(() => fetchAccounts(false), [fetchAccounts]);

  useEffect(() => {
    fetchAccounts(true);
  }, [fetchAccounts]);

  const createAccount = async (account: Omit<Account, 'id' | 'created_at' | 'active'>) => {
    const { error } = await supabase.from('accounts').insert({
      ...account,
      active: true,
    });
    if (!error) await fetchAccounts(false);
    return { error };
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase
      .from('accounts')
      .update({ active: false })
      .eq('id', id);
    if (!error) await fetchAccounts(false);
    return { error };
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  };

  const getBalanceByCurrency = () => {
    return accounts.reduce((acc, a) => {
      acc[a.currency] = (acc[a.currency] || 0) + a.balance;
      return acc;
    }, {} as Record<string, number>);
  };

  const getAccountsByCurrency = (currency: string) => {
    return accounts.filter(a => a.currency === currency);
  };

    return (
    <AccountsContext.Provider value={{ accounts, loading, error, refetch, createAccount, deleteAccount, getTotalBalance, getBalanceByCurrency, getAccountsByCurrency }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccountsContext() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccountsContext must be used within an AccountsProvider');
  }
  return context;
}