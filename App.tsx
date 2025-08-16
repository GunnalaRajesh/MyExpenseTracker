
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionType } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Summary from './components/Summary';
import ExpenseChart from './components/ExpenseChart';
import TransactionForm from './components/TransactionForm';
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, ListBulletIcon, UploadIcon } from './components/icons';
import TransactionsView from './components/TransactionsView';

const App: React.FC = () => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTransactions = useCallback((newTransactions: Omit<Transaction, 'id'>[]) => {
    setTransactions(prev => {
      const transactionsWithIds = newTransactions.map(t => ({ ...t, id: uuidv4() }));
      const combined = [...prev, ...transactionsWithIds];

      // Deduplicate based on a composite key
      const unique = Array.from(
        new Map(combined.map(t => [`${t.date}-${t.description}-${t.amount}-${t.type}-${t.category}`, t])).values()
      );

      return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, [setTransactions]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    addTransactions([transaction]);
  }, [addTransactions]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, [setTransactions]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== 'application/json') {
      alert('Please upload a valid .json file.');
      if (event.target) event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("File content could not be read as text.");
        }
        const data = JSON.parse(text);
        
        if (!Array.isArray(data) || (data.length > 0 && typeof data[0].id === 'undefined')) {
          throw new Error("Invalid JSON format for transactions.");
        }

        addTransactions(data);
        alert("Transactions imported successfully!");
      } catch (error) {
        console.error("Failed to parse or process the file:", error);
        alert("Could not import transactions. The file might be corrupted or in the wrong format.");
      } finally {
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };


  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.date + 'T00:00:00');
      return transactionDate.getFullYear() === currentDate.getFullYear() &&
             transactionDate.getMonth() === currentDate.getMonth();
    });
  }, [transactions, currentDate]);

  const { totalIncome, totalExpenses } = useMemo(() => {
    return monthlyTransactions.reduce(
      (acc, t) => {
        if (t.type === TransactionType.INCOME) {
          acc.totalIncome += t.amount;
        } else {
          acc.totalExpenses += t.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );
  }, [monthlyTransactions]);

  const openingBalance = useMemo(() => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date + 'T00:00:00');
        return transactionDate < firstDayOfMonth;
      })
      .reduce((balance, t) => {
        if (t.type === TransactionType.INCOME) {
          return balance + t.amount;
        } else {
          return balance - t.amount;
        }
      }, 0);
  }, [transactions, currentDate]);

  const formattedMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col items-center mb-8 gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Financial Overview</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, track your financial health.</p>
          </div>
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center gap-2">
              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                  aria-hidden="true"
              />
              <button
                  onClick={handleUploadClick}
                  className="flex items-center gap-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-200"
              >
                <UploadIcon className="w-5 h-5" />
                Upload
              </button>
              <button
                  onClick={() => setIsTransactionsModalOpen(true)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-200"
                >
                <ListBulletIcon className="w-5 h-5" />
                Transactions
              </button>
            </div>
            <button
              onClick={() => setIsFormModalOpen(true)}
              className="flex w-full max-w-xs justify-center items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 mt-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Transaction
            </button>
          </div>
        </header>

        <main className="space-y-8">
          <div className="flex justify-center items-center gap-4 mb-6">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Previous month">
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-center w-48">{formattedMonth}</h2>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Next month">
                <ArrowRightIcon className="w-6 h-6" />
            </button>
          </div>
          
          <ExpenseChart transactions={monthlyTransactions} />
          <Summary totalIncome={totalIncome} totalExpenses={totalExpenses} openingBalance={openingBalance} />

        </main>

        <TransactionForm
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          addTransaction={addTransaction}
        />
        <TransactionsView
          isOpen={isTransactionsModalOpen}
          onClose={() => setIsTransactionsModalOpen(false)}
          transactions={transactions}
          deleteTransaction={deleteTransaction}
        />
      </div>
    </div>
  );
};

export default App;
