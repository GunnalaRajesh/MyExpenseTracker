import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Transaction, TransactionType, Category } from '../types';

interface ExpenseChartProps {
  transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D1FF', '#FF6B19'];

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg">
        <p className="label text-slate-800 dark:text-slate-100">{`${data.name} : ${data.value.toLocaleString('en-IN', {style: 'currency', currency: 'INR'})} (${data.percent.toFixed(0)}%)`}</p>
      </div>
    );
  }
  return null;
};

const renderPercentLabel = (props: any) => {
    const { value } = props;
    // Show percentage for all slices
    return (
        <text x={props.x} y={props.y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold">
        {`${Math.round(value)}%`}
        </text>
    );
};

const RADIAN = Math.PI / 180;
const renderOutsideLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, name, value } = props;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDarkMode ? '#e2e8f0' : '#334155'; // slate-200 and slate-700
    
    return (
        <text
            x={x}
            y={y}
            fill={textColor}
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={12}
        >
            {`${name}: ${value.toLocaleString('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0})}`}
        </text>
    );
};

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions }) => {
  const expenseData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    if (totalExpense === 0) return [];

    const expenseByCategory = expenses.reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = 0;
      }
      acc[transaction.category] += transaction.amount;
      return acc;
    }, {} as Record<Category, number>);

    return Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value,
      percent: (value / totalExpense) * 100,
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);
  
  if (expenseData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md h-full flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No expense data for this month to display chart.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md h-[400px]">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 pl-4">Expense Breakdown</h3>
        <ResponsiveContainer width="100%" height="90%">
            <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={renderOutsideLabel}
                >
                    {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="percent" content={renderPercentLabel} />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ExpenseChart;