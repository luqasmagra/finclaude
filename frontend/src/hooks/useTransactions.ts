import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { subDays, subMonths } from 'date-fns';

export function useTransactionsByPeriod(period: '30d' | '3m' | '1y' = '30d', accountIds?: string[]) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const periodRef = useRef(period);
  const accountIdsRef = useRef(accountIds);

  useEffect(() => {
    periodRef.current = period;
    accountIdsRef.current = accountIds;
  }, [period, accountIds]);

  useEffect(() => {
    let cancelled = false;

    const fetchByPeriod = async () => {
      setLoading(true);
      const now = new Date();
      const currentPeriod = periodRef.current;
      const currentAccountIds = accountIdsRef.current;
      let dateFrom: Date;

      switch (currentPeriod) {
        case '30d':
          dateFrom = subDays(now, 30);
          break;
        case '3m':
          dateFrom = subMonths(now, 3);
          break;
        case '1y':
          dateFrom = subMonths(now, 12);
          break;
      }

      const { data } = await supabase
        .from('transactions')
        .select('*, accounts(name, currency), categories(name, color, icon)')
        .gte('date', dateFrom.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (cancelled) return;

      let filtered = data || [];
      if (currentAccountIds && currentAccountIds.length > 0) {
        filtered = filtered.filter(t => currentAccountIds.includes(t.account_id));
      }


      setTransactions(filtered);
      setLoading(false);
    };

    fetchByPeriod();

    return () => {
      cancelled = true;
    };
  }, [period, accountIds]);

  const totalExpenses = useMemo(
    () => transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions]
  );

  const totalIncome = useMemo(
    () => transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const byCategory = useMemo(
    () =>
      transactions.filter(t => t.amount < 0).reduce((acc, t) => {
        const cat = t.categories?.name || 'Sin categoría';
        acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>),
    [transactions]
  );

  const byMonth = useMemo(
    () =>
      transactions.reduce((acc, t) => {
        const month = t.date.substring(0, 7);
        if (!acc[month]) {
          acc[month] = { income: 0, expenses: 0 };
        }
        if (t.amount > 0) {
          acc[month].income += t.amount;
        } else {
          acc[month].expenses += Math.abs(t.amount);
        }
        return acc;
      }, {} as Record<string, { income: number; expenses: number }>),
    [transactions]
  );

  return { transactions, loading, totalExpenses, totalIncome, byCategory, byMonth };
}