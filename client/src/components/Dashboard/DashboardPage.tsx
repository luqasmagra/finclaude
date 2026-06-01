import { useState, useMemo } from 'react';
import { useAccountsContext } from '../../context/AccountsContext';
import { useTransactionsByPeriod } from '../../hooks/useTransactions';
import { StatsCards } from './StatsCards';
import { DashboardCharts } from './DashboardCharts';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

export function DashboardPage() {
  const [period, setPeriod] = useState<'30d' | '3m' | '1y'>('1y');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ARS');
  const { accounts, getBalanceByCurrency } = useAccountsContext();

  const balanceByCurrency = useMemo(() => getBalanceByCurrency(), [getBalanceByCurrency]);
  const availableCurrencies = useMemo(() => {
    const currencies = [...new Set(accounts.map((a) => a.currency))];
    return currencies.sort();
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => a.currency === currencyFilter);
  }, [accounts, currencyFilter]);

  const filteredAccountIds = useMemo(() => {
    return filteredAccounts.map((a) => a.id);
  }, [filteredAccounts]);

  const currentBalance = balanceByCurrency[currencyFilter] || 0;

  const {
    transactions,
    totalExpenses,
    totalIncome,
    byCategory,
    byMonth,
  } = useTransactionsByPeriod(
    period,
    filteredAccountIds.length > 0 ? filteredAccountIds : undefined,
  );

  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const monthlyData = Object.entries(byMonth)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const avgMonthlyExpenses =
    monthlyData.length > 0 ? totalExpenses / monthlyData.length : 0;

  const periodLabels: Record<string, string> = {
    '30d': '30 días',
    '3m': '3 meses',
    '1y': '1 año',
  };

  return (
    <div className='h-full overflow-y-auto overflow-x-hidden relative'>
      {/* Ambient orb */}
      <div
        className='orb orb-1'
        aria-hidden='true'
        style={{
          position: 'absolute',
          top: '-150px',
          right: '-100px',
          width: '500px',
          height: '500px',
        }}
      />
      <div className='noise-overlay' aria-hidden='true' />

      <div className='relative z-10 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-up'>
          <div>
            <h1
              className='text-3xl font-bold text-[#fafafa]'
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Dashboard
            </h1>
            <p className='text-sm text-[#71717a] mt-1'>Resumen</p>
          </div>

          <div className='flex items-center gap-3'>
            {/* Currency selector */}
            {availableCurrencies.length > 1 && (
              <div className='flex bg-[#141418] rounded-xl p-1 border border-[#27272a]'>
                {availableCurrencies.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrencyFilter(c)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all font-medium ${
                      currencyFilter === c
                        ? 'bg-[#f59e0b] text-black shadow-lg'
                        : 'text-[#71717a] hover:text-[#a1a1aa]'
                    }`}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Period selector */}
            <div className='flex bg-[#141418] rounded-xl p-1 border border-[#27272a]'>
              {(['30d', '3m', '1y'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm rounded-lg transition-all font-medium ${
                    period === p
                      ? 'bg-[#f59e0b] text-black shadow-lg'
                      : 'text-[#71717a] hover:text-[#a1a1aa]'
                  }`}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  aria-pressed={period === p}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='animate-fade-in-up stagger-1'>
          <StatsCards
            totalBalance={currentBalance}
            totalExpenses={totalExpenses}
            totalIncome={totalIncome}
            avgMonthlyExpenses={avgMonthlyExpenses}
            accountsCount={filteredAccounts.length}
            currency={currencyFilter}
          />
        </div>

        {/* Quick summary cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6'>
          <div
            className='card p-5 animate-fade-in-up stagger-2 group'
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 rounded-xl bg-[#f59e0b] bg-opacity-10 group-hover:bg-opacity-20 transition-colors'>
                <Wallet
                  size={22}
                  className='text-[#f59e0b]'
                  aria-hidden='true'
                />
              </div>
              <h3
                className='text-sm font-medium text-[#a1a1aa]'
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Balance {currencyFilter}
              </h3>
            </div>
            <p
              className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {formatMoney(currentBalance, currencyFilter)}
            </p>
          </div>

          <div
            className='card p-5 animate-fade-in-up stagger-3 group'
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 rounded-xl bg-[#22c55e] bg-opacity-10 group-hover:bg-opacity-20 transition-colors'>
                <ArrowUpRight
                  size={22}
                  className='text-[#22c55e]'
                  aria-hidden='true'
                />
              </div>
              <h3
                className='text-sm font-medium text-[#a1a1aa]'
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Ingresos
              </h3>
            </div>
            <p
              className='text-3xl font-bold text-[#22c55e]'
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {formatMoney(totalIncome, currencyFilter)}
            </p>
          </div>

          <div
            className='card p-5 animate-fade-in-up stagger-4 group'
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 rounded-xl bg-[#ef4444] bg-opacity-10 group-hover:bg-opacity-20 transition-colors'>
                <ArrowDownRight
                  size={22}
                  className='text-[#ef4444]'
                  aria-hidden='true'
                />
              </div>
              <h3
                className='text-sm font-medium text-[#a1a1aa]'
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Gastos
              </h3>
            </div>
            <p
              className='text-3xl font-bold text-[#ef4444]'
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {formatMoney(totalExpenses, currencyFilter)}
            </p>
          </div>
        </div>

        {/* Charts */}
        <DashboardCharts
          transactions={transactions}
          currentBalance={currentBalance}
          categoryData={categoryData}
          monthlyData={monthlyData}
        />
      </div>
    </div>
  );
}
