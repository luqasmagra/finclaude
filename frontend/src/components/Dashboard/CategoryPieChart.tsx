import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatMoney } from '../../utils/formatters';

interface CategoryPieChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#7c6af7', '#4ade80', '#f87171', '#fbbf24', '#38bdf8', '#a78bfa'];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#6b6b80]">
        No hay gastos en el período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256} minHeight={256}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#141418', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
          formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name ?? '')]}
        />
        <Legend formatter={(value) => <span style={{ fontSize: 12, color: '#71717a' }}>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
