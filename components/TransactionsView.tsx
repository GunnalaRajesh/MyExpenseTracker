import React, { useState, useMemo } from 'react';
import { Transaction, Category } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants';
import { XMarkIcon } from './icons';
import TransactionList from './TransactionList';

interface TransactionsViewProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  deleteTransaction: (id: string) => void;
}

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const today = new Date().toISOString().split('T')[0];

const TransactionsView: React.FC<TransactionsViewProps> = ({ isOpen, onClose, transactions, deleteTransaction }) => {
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const resetFilters = () => {
    setSearchText('');
    setCategory('all');
    setStartDate('');
    setEndDate('');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const transactionDate = new Date(tx.date + 'T00:00:00');
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T00:00:00') : null;

      if (searchText && !tx.description.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      if (category !== 'all' && tx.category !== category) {
        return false;
      }
      if (start && transactionDate < start) {
        return false;
      }
      if (end && transactionDate > end) {
        return false;
      }
      return true;
    });
  }, [transactions, searchText, category, startDate, endDate]);

  const { totalIncome, totalExpenses } = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') {
          acc.totalIncome += t.amount;
        } else {
          acc.totalExpenses += t.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );
  }, [filteredTransactions]);

  const periodTitle = useMemo(() => {
    if (startDate && endDate) {
        return `${startDate} to ${endDate}`;
    }
    if(startDate) {
        return `From ${startDate}`;
    }
    if(endDate) {
        return `Until ${endDate}`;
    }
    return 'All Time';
  }, [startDate, endDate]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col" role="dialog" aria-modal="true" aria-labelledby="transactions-title">
      <header className="flex-shrink-0 bg-white dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h2 id="transactions-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            All Transactions
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <XMarkIcon className="w-8 h-8"/>
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Filter Section */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Search</label>
                <input
                  id="search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="e.g., Coffee"
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                <select
                  id="category-filter"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category | 'all')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Categories</option>
                  {ALL_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">From</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || today}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">To</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={today}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
                <button
                    onClick={resetFilters}
                    className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold py-2 px-4 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors text-sm"
                >
                    Reset Filters
                </button>
            </div>
          </div>

          <TransactionList
            transactions={filteredTransactions}
            deleteTransaction={deleteTransaction}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            periodTitle={periodTitle}
            allTransactions={transactions}
          />
        </div>
      </main>
    </div>
  );
};

export default TransactionsView;