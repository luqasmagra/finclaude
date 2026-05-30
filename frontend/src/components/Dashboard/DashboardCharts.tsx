import { TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import { BalanceChart } from './BalanceChart';
import { CategoryPieChart } from './CategoryPieChart';
import { MonthlyBarChart } from './MonthlyBarChart';
import type { Transaction } from '../../types';

interface DashboardChartsProps {
  transactions: Transaction[];
  currentBalance: number;
  categoryData: { name: string; value: number }[];
  monthlyData: { month: string; income: number; expenses: number }[];
}

export function DashboardCharts({
  transactions,
  currentBalance,
  categoryData,
  monthlyData,
}: DashboardChartsProps) {
  return (
    <>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6'>
        <section
          className='card p-6 animate-fade-in-up stagger-5'
          aria-labelledby='balance-chart-heading'
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className='flex items-center gap-3 mb-5'>
            <div className='p-2 rounded-lg bg-[#f59e0b] bg-opacity-10'>
              <TrendingUp
                className='text-[#f59e0b]'
                size={20}
                aria-hidden='true'
              />
            </div>
            <h2
              id='balance-chart-heading'
              className='font-semibold text-[#fafafa] text-lg'
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Balance histórico
            </h2>
          </div>
          <BalanceChart
            transactions={transactions}
            currentBalance={currentBalance}
          />
        </section>

        <section
          className='card p-6 animate-fade-in-up stagger-6'
          aria-labelledby='category-chart-heading'
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className='flex items-center gap-3 mb-5'>
            <div className='p-2 rounded-lg bg-[#f59e0b] bg-opacity-10'>
              <PieChart
                className='text-[#f59e0b]'
                size={20}
                aria-hidden='true'
              />
            </div>
            <h2
              id='category-chart-heading'
              className='font-semibold text-[#fafafa] text-lg'
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Gastos por categoría
            </h2>
          </div>
          <CategoryPieChart data={categoryData} />
        </section>
      </div>

      <section
        className='card p-6 mt-6 animate-fade-in-up stagger-6'
        aria-labelledby='monthly-chart-heading'
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className='flex items-center gap-3 mb-5'>
          <div className='p-2 rounded-lg bg-[#f59e0b] bg-opacity-10'>
            <BarChart3
              className='text-[#f59e0b]'
              size={20}
              aria-hidden='true'
            />
          </div>
          <h2
            id='monthly-chart-heading'
            className='font-semibold text-[#fafafa] text-lg'
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Ingresos vs Egresos mensuales
          </h2>
        </div>
        <MonthlyBarChart data={monthlyData} currentBalance={currentBalance} />
      </section>
    </>
  );
}
