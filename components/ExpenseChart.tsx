import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LabelList,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Transaction, TransactionType, Category } from '../types';

interface ExpenseChartProps {
  transactions: Transaction[];
  currentDate: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D1FF', '#FF6B19'];

// Pie Chart Components
const CustomPieTooltip: React.FC<any> = ({ active, payload }) => {
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
    const textColor = isDarkMode ? '#e2e8f0' : '#334155';
    
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


// Line Chart Components
const CustomLineTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg">
          <p className="label text-slate-800 dark:text-slate-100">{`Day ${label}: ${payload[0].value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`}</p>
        </div>
      );
    }
    return null;
};

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions, currentDate }) => {
  const [activeView, setActiveView] = useState<'category' | 'daily'>('category');

  const { expenseData, dailySpendingData } = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    let pieChartData: any[] = [];
    if (totalExpense > 0) {
        const expenseByCategory = expenses.reduce((acc, transaction) => {
            if (!acc[transaction.category]) acc[transaction.category] = 0;
            acc[transaction.category] += transaction.amount;
            return acc;
        }, {} as Record<Category, number>);

        pieChartData = Object.entries(expenseByCategory).map(([name, value]) => ({
            name,
            value,
            percent: (Number(value) / totalExpense) * 100,
        })).sort((a, b) => Number(b.value) - Number(a.value));
    }

    let lineChartData: { day: number, amount: number }[] = [];
    if (expenses.length > 0) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const expensesByDay = new Map<number, number>();
        expenses.forEach(t => {
            const day = new Date(t.date + 'T00:00:00').getDate();
            expensesByDay.set(day, (expensesByDay.get(day) || 0) + t.amount);
        });

        for (let day = 1; day <= daysInMonth; day++) {
            lineChartData.push({ day, amount: expensesByDay.get(day) || 0 });
        }
    }

    return { expenseData: pieChartData, dailySpendingData: lineChartData };
  }, [transactions, currentDate]);
  
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDarkMode ? '#e2e8f0' : '#475569';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

  const CustomizedLineLabel: React.FC<any> = (props) => {
    const { x, y, value } = props;
    const isDarkMode = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const labelTextColor = isDarkMode ? '#94a3b8' : '#64748b'; // slate-400 : slate-500

    if (value > 0) {
        return (
            <text x={x} y={y} dy={-10} fill={labelTextColor} fontSize={11} textAnchor="middle" fontWeight="500">
                {Math.round(value)}
            </text>
        );
    }
    return null;
  };

  const renderCategoryChart = () => {
    if (expenseData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">No expense data to display chart.</p>
        </div>
      );
    }
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <Pie data={expenseData} cx="50%" cy="50%" labelLine outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={renderOutsideLabel}>
                    {expenseData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    <LabelList dataKey="percent" content={renderPercentLabel} />
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
        </ResponsiveContainer>
    );
  };
  
  const renderDailyChart = () => {
    const hasSpending = dailySpendingData.some(d => d.amount > 0);
    if (!hasSpending) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">No daily spending recorded this month.</p>
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dailySpendingData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="day" tick={{ fill: textColor, fontSize: 12 }} axisLine={{ stroke: textColor }} tickLine={{ stroke: textColor }} label={{ value: 'Day of the month', position: 'insideBottom', offset: -15, fill: textColor, fontSize: 12, fontWeight: 'bold' }} />
          <YAxis tickFormatter={(value) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', compactDisplay: 'short' })} tick={{ fill: textColor, fontSize: 12 }} axisLine={{ stroke: textColor }} tickLine={{ stroke: textColor }} />
          <Tooltip content={<CustomLineTooltip />} />
          <Line type="monotone" dataKey="amount" name="Amount Spent" stroke="#8884d8" strokeWidth={2} dot={{ r: 4, fill: '#8884d8' }} activeDot={{ r: 8, stroke: '#6366f1' }}>
            <LabelList dataKey="amount" content={<CustomizedLineLabel />} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md h-[450px]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 px-3 gap-2">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Expense Analysis</h3>
            <div className="flex rounded-md shadow-sm self-start sm:self-center">
                <button type="button" onClick={() => setActiveView('category')} className={`py-1.5 px-3 text-sm font-medium rounded-l-md transition-colors ${activeView === 'category' ? 'bg-indigo-600 text-white z-10 ring-2 ring-indigo-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                    By Category
                </button>
                <button type="button" onClick={() => setActiveView('daily')} className={`py-1.5 px-3 text-sm font-medium rounded-r-md transition-colors -ml-px ${activeView === 'daily' ? 'bg-indigo-600 text-white z-10 ring-2 ring-indigo-500' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                    Daily Trends
                </button>
            </div>
        </div>
        
        <div className="h-[calc(100%-4rem)]">
            {activeView === 'category' ? renderCategoryChart() : renderDailyChart()}
        </div>
    </div>
  );
};

export default ExpenseChart;