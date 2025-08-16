import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, TransactionType } from '../types';
import { TrashIcon, IncomeIcon, ExpenseIcon, DownloadIcon } from './icons';

interface TransactionListProps {
  transactions: Transaction[];
  deleteTransaction: (id: string) => void;
  totalIncome: number;
  totalExpenses: number;
  periodTitle: string;
  allTransactions: Transaction[];
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

const TransactionList: React.FC<TransactionListProps> = ({ transactions, deleteTransaction, totalIncome, totalExpenses, periodTitle, allTransactions }) => {

  const handleDownloadPdf = () => {
    if (transactions.length === 0) {
      alert("No transactions to export for this period.");
      return;
    }
    const doc = new jsPDF();
    const balance = totalIncome - totalExpenses;

    // Header
    doc.setFontSize(20);
    doc.text('Transaction Statement', 14, 22);
    doc.setFontSize(12);
    
    if (periodTitle === 'All Time') {
      doc.text(`Statement Date: ${new Date().toLocaleString()}`, 14, 30);
    } else {
      doc.text(`Period: ${periodTitle}`, 14, 30);
    }
    
    doc.line(14, 32, 196, 32); // Horizontal line

    // Summary Table
    autoTable(doc, {
      body: [
        ['Total Income', `${totalIncome.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`],
        ['Total Expenses', `${totalExpenses.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`],
        ['Balance', `${balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`],
      ],
      startY: 38,
      theme: 'plain',
      styles: { fontSize: 12 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
      }
    });

    // Transactions Table
    const tableColumn = ['Date', 'Description', 'Category', 'Income', 'Expense'];
    const tableRows = transactions.map(tx => {
      const date = tx.date; // Use YYYY-MM-DD format for consistency
      const income = tx.type === TransactionType.INCOME ? `${tx.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}` : '';
      const expense = tx.type === TransactionType.EXPENSE ? `${tx.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}` : '';
      return [date, tx.description, tx.category, income, expense];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: (doc as any).lastAutoTable.finalY + 10,
      headStyles: {
        fillColor: [79, 70, 229] // indigo-600
      },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold', textColor: [34, 197, 94] }, // green-500
        4: { halign: 'right', fontStyle: 'bold', textColor: [239, 68, 68] }, // red-500
      }
    });

    // Save
    doc.save(`Transaction_Statement_${periodTitle.replace(/ /g, '_')}.pdf`);
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

  return (
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
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
            aria-label="Download transactions as PDF"
          >
            <DownloadIcon className="w-5 h-5" />
            <span>PDF</span>
          </button>
        </div>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} onDelete={deleteTransaction} />
        ))}
      </ul>
    </div>
  );
};

export default TransactionList;