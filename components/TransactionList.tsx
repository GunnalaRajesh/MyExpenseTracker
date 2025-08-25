import React, { useMemo, useRef, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LabelList,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Transaction, TransactionType, Category } from '../types';
import { TrashIcon, IncomeIcon, ExpenseIcon, DownloadIcon } from './icons';

interface TransactionListProps {
  transactions: Transaction[];
  deleteTransaction: (id: string) => void;
  allTransactions: Transaction[];
  onDownloadPdf: (pieChartImage: string | null, lineChartImage: string | null) => void;
}

const TransactionItem: React.FC<{ transaction: Transaction; onDelete: (id: string) => void }> = ({ transaction, onDelete }) => {
  const isIncome = transaction.type === TransactionType.INCOME;
  const amountColor = isIncome ? 'text-green-500' : 'text-red-500';
  const Icon = isIncome ? IncomeIcon : ExpenseIcon;
  const iconBgColor = isIncome ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50';

  return (
    <li className="flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${iconBgColor} ${amountColor}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{transaction.description}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{transaction.category} &bull; {new Date(transaction.date + 'T00:00:00').toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-bold ${amountColor}`}>
          {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
        </span>
        <button onClick={() => onDelete(transaction.id)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
};

// Chart rendering helpers for PDF (adapted from ExpenseChart.tsx)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D1FF', '#FF6B19'];
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
    const textColor = '#334155'; // Hardcoded for PDF
    
    return (
        <text x={x} y={y} fill={textColor} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
            {`${name}: ${value.toLocaleString('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0})}`}
        </text>
    );
};
const CustomizedLineLabel: React.FC<any> = (props) => {
    const { x, y, value } = props;
    const labelTextColor = '#64748b'; // Hardcoded for PDF

    if (value > 0) {
        return (
            <text x={x} y={y} dy={-10} fill={labelTextColor} fontSize={11} textAnchor="middle" fontWeight="500">
                {Math.round(value)}
            </text>
        );
    }
    return null;
};
const CustomLineTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-slate-300 rounded-md shadow-lg">
          <p className="label text-slate-800">{`${label}: ${payload[0].value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`}</p>
        </div>
      );
    }
    return null;
};
const getChartAsImage = (ref: React.RefObject<HTMLDivElement>): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!ref.current) return resolve(null);
        const svg = ref.current.querySelector('svg');
        if (!svg) return resolve(null);

        const svgString = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const scale = 2; // For better resolution
            canvas.width = svg.clientWidth * scale;
            canvas.height = svg.clientHeight * scale;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const pngDataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(pngDataUrl);
        };
        img.onerror = (e) => {
            console.error("Image loading failed for SVG to PNG conversion", e);
            URL.revokeObjectURL(url);
            resolve(null);
        };
        img.src = url;
    });
};


const TransactionList: React.FC<TransactionListProps> = ({ transactions, deleteTransaction, allTransactions, onDownloadPdf }) => {
  const pieChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { expenseData, dailySpendingData } = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    
    // Pie chart data
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    let pieChartData: any[] = [];
    if (totalExpense > 0) {
        const expenseByCategory = expenses.reduce((acc, transaction) => {
            if (!acc[transaction.category]) acc[transaction.category] = 0;
            acc[transaction.category] += transaction.amount;
            return acc;
        }, {} as Record<Category, number>);

        pieChartData = Object.entries(expenseByCategory).map(([name, value]) => ({
            name, value, percent: (Number(value) / totalExpense) * 100,
        })).sort((a, b) => Number(b.value) - Number(a.value));
    }

    // Line chart data
    let lineChartData: { date: string, amount: number }[] = [];
    if (expenses.length > 0) {
      const validDates = expenses
        .map(t => new Date(t.date + 'T00:00:00'))
        .filter(d => !isNaN(d.getTime()));

      if (validDates.length > 0) {
        let minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
        let maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));
  
        // If the date range is within a single month, expand it to the full month
        if (minDate.getFullYear() === maxDate.getFullYear() && minDate.getMonth() === maxDate.getMonth()) {
            const year = minDate.getFullYear();
            const month = minDate.getMonth();
            minDate = new Date(year, month, 1);
            maxDate = new Date(year, month + 1, 0); // Last day of the month
        }

        const expensesByDay = new Map<string, number>(); // key as YYYY-MM-DD
        expenses.forEach(t => {
            expensesByDay.set(t.date, (expensesByDay.get(t.date) || 0) + t.amount);
        });
  
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            lineChartData.push({ date: dateKey, amount: expensesByDay.get(dateKey) || 0 });
        }
      }
    }
    return { expenseData: pieChartData, dailySpendingData: lineChartData };
  }, [transactions]);

  const handleTriggerPdfDownload = async () => {
    if (transactions.length === 0) {
      alert("No transactions to export for this period.");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const pieChartImage = await getChartAsImage(pieChartRef);
      const lineChartImage = await getChartAsImage(lineChartRef);
      onDownloadPdf(pieChartImage, lineChartImage);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("An error occurred while generating the PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJson = () => {
    if (allTransactions.length === 0) {
      alert("No transactions to back up.");
      return;
    }
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(allTransactions, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `my_transactions_backup.json`;
    link.click();
  };

  if (transactions.length === 0) {
    return (
       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md h-full flex items-center justify-center text-center">
          <p className="text-slate-500 dark:text-slate-400">No transactions match your current filters.</p>
      </div>
    );
  }

  const hasExpenses = dailySpendingData.some(d => d.amount > 0);

  return (
    <div>
      {/* Hidden charts for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', height: '400px', background: 'white' }} ref={pieChartRef}>
        {expenseData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
              <Pie isAnimationActive={false} data={expenseData} cx="50%" cy="50%" labelLine outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={renderOutsideLabel}>
                {expenseData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                <LabelList dataKey="percent" content={renderPercentLabel} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', height: '400px', background: 'white' }} ref={lineChartRef}>
        {hasExpenses && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySpendingData} margin={{ top: 20, right: 40, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={{ stroke: '#475569' }} tickLine={{ stroke: '#475569' }} tickFormatter={(dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} interval="preserveStartEnd" />
              <YAxis tickFormatter={(value) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', compactDisplay: 'short' })} tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#475569' }} tickLine={{ stroke: '#475569' }} />
              <Tooltip content={<CustomLineTooltip />} />
              <Line isAnimationActive={false} type="monotone" dataKey="amount" name="Amount Spent" stroke="#8884d8" strokeWidth={2} dot={{ r: 4, fill: '#8884d8' }} activeDot={{ r: 8, stroke: '#6366f1' }}>
                <LabelList dataKey="amount" content={<CustomizedLineLabel />} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4 px-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Transactions</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
              aria-label="Backup transactions as JSON"
            >
              <DownloadIcon className="w-5 h-5" />
              <span>Backup</span>
            </button>
            <button
              onClick={handleTriggerPdfDownload}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
              aria-label="Download transactions as PDF"
            >
              <DownloadIcon className="w-5 h-5" />
              <span>{isGeneratingPdf ? 'Generating...' : 'PDF'}</span>
            </button>
          </div>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} onDelete={deleteTransaction} />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TransactionList;