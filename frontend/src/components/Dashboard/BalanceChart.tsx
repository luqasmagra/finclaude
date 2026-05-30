import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Transaction } from '../../types';
import { formatMoney, formatMonth } from '../../utils/formatters';

interface BalanceChartProps {
  transactions: Transaction[];
  currentBalance?: number;
}

export function BalanceChart({ transactions, currentBalance }: BalanceChartProps) {
  const data = useMemo(() =>
    transactions.reduce((acc, tx) => {
      const month = tx.date.substring(0, 7);
      const existing = acc.find(d => d.month === month);
      if (existing) {
        existing.balance += tx.amount;
      } else {
        acc.push({ month, balance: tx.amount });
      }
      return acc;
    }, [] as { month: string; balance: number }[])
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        month: formatMonth(d.month),
      })),
  [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#6b6b80]">
        No hay datos suficientes
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256} minHeight={256}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={12} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: '#141418', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
          formatter={(value) => [formatMoney(Number(value ?? 0)), 'Balance']}
        />
        {currentBalance !== undefined && (
          <ReferenceLine
            y={currentBalance}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{ value: formatMoney(currentBalance), fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: '#fbbf24' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
