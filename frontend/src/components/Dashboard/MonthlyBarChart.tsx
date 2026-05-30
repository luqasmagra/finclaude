import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { formatMoney, formatMonth } from '../../utils/formatters';

interface MonthlyBarChartProps {
  data: { month: string; income: number; expenses: number }[];
  currentBalance?: number;
}

export function MonthlyBarChart({ data, currentBalance }: MonthlyBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#6b6b80]">
        No hay datos en el período
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    month: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={256} minHeight={256}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} />
        <YAxis stroke="#71717a" fontSize={12} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          contentStyle={{ background: '#141418', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
          itemStyle={{ color: '#fafafa' }}
          formatter={(value: number | string, name: string) => [formatMoney(Number(value)), name === 'income' ? 'Ingresos' : 'Egresos']}
        />
        <Legend formatter={(value) => <span style={{ fontSize: 12, color: '#71717a' }}>{value === 'income' ? 'Ingresos' : 'Egresos'}</span>} />
        {currentBalance !== undefined && (
          <ReferenceLine
            y={currentBalance}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{ value: formatMoney(currentBalance), fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}