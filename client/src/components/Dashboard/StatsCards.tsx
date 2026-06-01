import { Wallet, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

interface StatsCardsProps {
  totalBalance: number;
  totalExpenses: number;
  totalIncome: number;
  avgMonthlyExpenses: number;
  accountsCount: number;
  currency?: string;
}

export function StatsCards({
  totalBalance,
  totalExpenses,
  totalIncome,
  avgMonthlyExpenses,
  accountsCount,
  currency,
}: StatsCardsProps) {
  const curr = currency || 'ARS';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card p-5 group" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5 mb-3 text-[#71717a]">
          <div className="p-2 rounded-lg bg-[#f59e0b] bg-opacity-10 group-hover:bg-opacity-20 transition-colors">
            <Wallet size={16} className="text-[#f59e0b]" />
          </div>
          <span className="text-xs uppercase tracking-wider font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Balance</span>
        </div>
        <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {formatMoney(totalBalance, curr)}
        </div>
        <div className="text-xs text-[#52525b] mt-2">{accountsCount} cuenta{accountsCount !== 1 ? 's' : ''}</div>
      </div>

      <div className="card p-5 group" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5 mb-3 text-[#71717a]">
          <div className="p-2 rounded-lg bg-[#ef4444] bg-opacity-10 group-hover:bg-opacity-20 transition-colors">
            <TrendingDown size={16} className="text-[#ef4444]" />
          </div>
          <span className="text-xs uppercase tracking-wider font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gastos</span>
        </div>
        <div className="text-2xl font-bold text-[#ef4444]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {formatMoney(totalExpenses, curr)}
        </div>
        <div className="text-xs text-[#52525b] mt-2">en el período</div>
      </div>

      <div className="card p-5 group" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5 mb-3 text-[#71717a]">
          <div className="p-2 rounded-lg bg-[#22c55e] bg-opacity-10 group-hover:bg-opacity-20 transition-colors">
            <TrendingUp size={16} className="text-[#22c55e]" />
          </div>
          <span className="text-xs uppercase tracking-wider font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ingresos</span>
        </div>
        <div className="text-2xl font-bold text-[#22c55e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {formatMoney(totalIncome, curr)}
        </div>
        <div className="text-xs text-[#52525b] mt-2">en el período</div>
      </div>

      <div className="card p-5 group" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5 mb-3 text-[#71717a]">
          <div className="p-2 rounded-lg bg-[#f59e0b] bg-opacity-10 group-hover:bg-opacity-20 transition-colors">
            <CreditCard size={16} className="text-[#f59e0b]" />
          </div>
          <span className="text-xs uppercase tracking-wider font-medium" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Promedio mensual</span>
        </div>
        <div className="text-2xl font-bold text-[#fafafa]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {formatMoney(avgMonthlyExpenses, curr)}
        </div>
        <div className="text-xs text-[#52525b] mt-2">de gastos</div>
      </div>
    </div>
  );
}