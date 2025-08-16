
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants';
import { XMarkIcon } from './icons';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ isOpen, onClose, addTransaction }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<Category>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const categories = type === TransactionType.EXPENSE ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  useEffect(() => {
    setCategory(categories[0]);
  }, [type, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category || !date) {
      alert('Please fill all fields');
      return;
    }

    addTransaction({
      type,
      category,
      amount: parseFloat(amount),
      description,
      date,
    });
    
    // Reset form and close
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setType(TransactionType.EXPENSE);
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Add New Transaction</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <XMarkIcon className="w-6 h-6"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`w-full py-2 px-4 text-sm font-medium rounded-l-md transition-colors ${
                  type === TransactionType.EXPENSE
                    ? 'bg-red-500 text-white z-10 ring-2 ring-red-500'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType(TransactionType.INCOME)}
                className={`w-full py-2 px-4 text-sm font-medium rounded-r-md transition-colors -ml-px ${
                  type === TransactionType.INCOME
                    ? 'bg-green-500 text-white z-10 ring-2 ring-green-500'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Amount</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Groceries"
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-slate-800 dark:text-slate-200"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold py-2 px-4 rounded-md mr-2 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
