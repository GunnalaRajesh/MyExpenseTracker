

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, TransactionType, PlannedExpense, Category } from './types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES } from './constants';
import useLocalStorage from './hooks/useLocalStorage';
import Summary from './components/Summary';
import ExpenseChart from './components/ExpenseChart';
import TransactionForm from './components/TransactionForm';
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, ListBulletIcon, UploadIcon } from './components/icons';
import TransactionsView from './components/TransactionsView';
import NextMonthExpensePlan from './components/NextMonthExpensePlan';
import NextMonthExpensePlanForm from './components/NextMonthExpensePlanForm';


const App: React.FC = () => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [plannedExpenses, setPlannedExpenses] = useLocalStorage<PlannedExpense[]>('plannedExpenses', []);
  const [lastAutoDownload, setLastAutoDownload] = useLocalStorage<string>('lastAutoDownload', '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPlanFormModalOpen, setIsPlanFormModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateTransactionPdf = useCallback((
    transactionsToExport: Transaction[],
    income: number,
    expenses: number,
    periodTitle: string,
    pieChartImage: string | null,
    lineChartImage: string | null
  ) => {
    if (transactionsToExport.length === 0) {
      alert("No transactions to export for this period.");
      return;
    }

    const doc = new jsPDF();
    const balance = income - expenses;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header
    const title = 'Transaction Statement';
    const titleWidth = doc.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    doc.setFontSize(20);
    doc.text(title, titleX, 22);
    doc.setFontSize(12);

    const reportDate = new Date().toLocaleString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const finalPeriodTitle = periodTitle === 'All Time' ? `Report Generated on ${reportDate}` : periodTitle;

    doc.text(`Period: ${finalPeriodTitle}`, margin, 30);
    doc.line(margin, 32, pageWidth - margin, 32);

    // Summary Table
    autoTable(doc, {
      body: [
        ['Total Income', `${income.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`],
        ['Total Expenses', `${expenses.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`],
        ['Balance', `${balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`],
      ],
      startY: 38, theme: 'plain', styles: { fontSize: 12 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }}
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    const checkPageBreak = (currentY: number, elementHeight: number): number => {
        if (currentY + elementHeight > pageHeight - margin) {
            doc.addPage();
            return margin; // Top margin for new page
        }
        return currentY;
    };
    
    // Charts Section (Side-by-side) - only if images are provided
    if (pieChartImage || lineChartImage) {
        finalY += 10;
        const chartGap = 8;
        const chartWidth = (pageWidth - (margin * 2) - chartGap) / 2;
        const chartHeight = chartWidth / 2; // Maintain 2:1 aspect ratio
        const sectionHeight = chartHeight + 20;

        finalY = checkPageBreak(finalY, sectionHeight);
        const chartY = finalY + 8;

        if (pieChartImage) {
            doc.setFontSize(12);
            doc.text('Expense Analysis by Category', margin, finalY);
            doc.addImage(pieChartImage, 'PNG', margin, chartY, chartWidth, chartHeight);
        }

        if (lineChartImage) {
            const lineChartX = margin + chartWidth + chartGap;
            doc.setFontSize(12);
            doc.text('Daily Spending Trends', lineChartX, finalY);
            doc.addImage(lineChartImage, 'PNG', lineChartX, chartY, chartWidth, chartHeight);
        }

        finalY += sectionHeight;
    }
    
    // Transactions Table Section
    finalY = checkPageBreak(finalY, 20); // Check space for title
    doc.setFontSize(14);
    doc.text('All Transactions', margin, finalY);

    const tableColumn = ['Date', 'Description', 'Category', 'Income', 'Expense'];
    const tableRows = transactionsToExport.map(tx => [
        new Date(tx.date + 'T00:00:00').toLocaleDateString('en-IN'),
        tx.description, tx.category,
        tx.type === TransactionType.INCOME ? tx.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
        tx.type === TransactionType.EXPENSE ? tx.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : '',
    ]);
    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: finalY + 8,
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold', textColor: [34, 197, 94] },
        4: { halign: 'right', fontStyle: 'bold', textColor: [239, 68, 68] },
      }
    });

    const safeFilename = `Transaction_Statement_${periodTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    doc.save(`${safeFilename}.pdf`);
  }, []);

  useEffect(() => {
    const checkAndAutoDownload = () => {
        if (!navigator.onLine) {
            console.log("Offline. Skipping auto-download check.");
            return;
        }

        const today = new Date();
        const lastDayOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const lastDayOfPreviousMonthStr = lastDayOfPreviousMonth.toISOString().split('T')[0];

        if (!lastAutoDownload || lastAutoDownload < lastDayOfPreviousMonthStr) {
            const year = lastDayOfPreviousMonth.getFullYear();
            const month = lastDayOfPreviousMonth.getMonth();

            const transactionsForLastMonth = transactions.filter(t => {
                const transactionDate = new Date(t.date + 'T00:00:00');
                return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
            });

            if (transactionsForLastMonth.length > 0) {
                console.log(`Auto-downloading statement for ${lastDayOfPreviousMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}.`);
                
                const { totalIncome, totalExpenses } = transactionsForLastMonth.reduce(
                    (acc, t) => {
                        if (t.type === TransactionType.INCOME) acc.totalIncome += t.amount;
                        else acc.totalExpenses += t.amount;
                        return acc;
                    }, { totalIncome: 0, totalExpenses: 0 }
                );

                const periodTitle = lastDayOfPreviousMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
                
                generateTransactionPdf(transactionsForLastMonth, totalIncome, totalExpenses, periodTitle, null, null);
            }
            
            setLastAutoDownload(lastDayOfPreviousMonthStr);
        }
    };
    
    const timerId = setTimeout(checkAndAutoDownload, 5000); 

    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for handling notification permission on load
  useEffect(() => {
    if (!('Notification' in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }

    const checkPermission = async () => {
      let permission = Notification.permission;
      // Request permission if it's not explicitly granted or denied
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      setNotificationPermissionStatus(permission);
    };

    checkPermission();
  }, []);

  // Effect for handling notifications for planned expenses
  useEffect(() => {
    if (notificationPermissionStatus !== 'granted') {
      return;
    }

    const now = new Date();
    let hasChanges = false;
    const updatedPlannedExpenses = plannedExpenses.map(plan => {
      if (plan.isReminderSet && plan.reminderDateTime && !plan.notificationShown && new Date(plan.reminderDateTime) <= now) {
        new Notification(plan.title, {
          body: `Category: ${plan.category}`,
          icon: '/icon-192x192.png'
        });
        hasChanges = true;
        return { ...plan, notificationShown: true };
      }
      return plan;
    });

    if (hasChanges) {
      setPlannedExpenses(updatedPlannedExpenses);
    }
  }, [plannedExpenses, setPlannedExpenses, notificationPermissionStatus]);
  
  // Effect for cleaning up old one-time planned expenses
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    const plansToKeep = plannedExpenses.filter(p => {
        if (p.isRecurring) {
            return true;
        }
        if (p.targetMonth) {
            const [year, month] = p.targetMonth.split('-').map(Number);
            // In targetMonth, month is 1-based. Convert to 0-based for comparison.
            if (year < currentYear || (year === currentYear && month - 1 < currentMonth)) {
                return false; // This is a past, non-recurring plan, so remove it.
            }
        }
        return true; // Keep recurring plans and future/current one-time plans
    });

    if (plansToKeep.length < plannedExpenses.length) {
        setPlannedExpenses(plansToKeep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addTransactions = useCallback((newTransactions: any[]) => {
    setTransactions(prev => {
      const sanitizedTransactions = newTransactions
        .filter(t => typeof t.amount === 'number' && t.date && typeof t.date === 'string')
        .map((t): Transaction => ({
          id: t.id || uuidv4(),
          type: t.type === TransactionType.INCOME ? TransactionType.INCOME : TransactionType.EXPENSE,
          category: t.category && ALL_CATEGORIES.includes(t.category)
            ? t.category
            : (t.type === TransactionType.INCOME ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
          amount: t.amount,
          description: t.description || 'Imported Transaction',
          date: t.date,
        }));

      const combined = [...prev, ...sanitizedTransactions];
      const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
      return unique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, [setTransactions]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    addTransactions([transaction]);
  }, [addTransactions]);
  
  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, [setTransactions]);

  const addPlannedExpense = useCallback((plan: Omit<PlannedExpense, 'id'>) => {
    setPlannedExpenses(prev => {
        const newPlan = { ...plan, id: uuidv4() };
        const updated = [...prev, newPlan];
        return updated.sort((a, b) => (a.reminderDateTime && b.reminderDateTime) ? new Date(a.reminderDateTime).getTime() - new Date(b.reminderDateTime).getTime() : 0);
    });
  }, [setPlannedExpenses]);

  const addPlannedExpensesBatch = useCallback((newPlans: any[]) => {
    setPlannedExpenses(prev => {
      const sanitizedPlans = newPlans
        .filter(p => p.title && typeof p.amount === 'number')
        .map((p): PlannedExpense => ({
          id: p.id || uuidv4(),
          title: p.title,
          description: p.description || undefined,
          amount: p.amount,
          category: p.category && EXPENSE_CATEGORIES.includes(p.category) ? p.category : EXPENSE_CATEGORIES[0],
          isReminderSet: !!p.isReminderSet,
          reminderDateTime: p.reminderDateTime || undefined,
          notificationShown: !!p.notificationShown,
          isRecurring: !!p.isRecurring,
          targetMonth: p.targetMonth || undefined,
        }));
      
      const combined = [...prev, ...sanitizedPlans];
      const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());
      return unique.sort((a, b) => (a.reminderDateTime && b.reminderDateTime) ? new Date(a.reminderDateTime).getTime() - new Date(b.reminderDateTime).getTime() : 0);
    });
  }, [setPlannedExpenses]);


  const deletePlannedExpense = useCallback((id: string) => {
    setPlannedExpenses(prev => prev.filter(p => p.id !== id));
  }, [setPlannedExpenses]);


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
        
        let transactionsToImport: any[] = [];
        let plansToImport: any[] = [];

        // Check for new backup format with transactions and/or plannedExpenses
        if (typeof data === 'object' && data !== null && !Array.isArray(data) && ('transactions' in data || 'plannedExpenses' in data)) {
            transactionsToImport = Array.isArray(data.transactions) ? data.transactions : [];
            plansToImport = Array.isArray(data.plannedExpenses) ? data.plannedExpenses : [];
        } 
        // Check for old backup format (just an array of transactions)
        else if (Array.isArray(data)) {
            transactionsToImport = data;
        } else {
            throw new Error("Invalid JSON format for backup file.");
        }

        if (transactionsToImport.length > 0) {
            addTransactions(transactionsToImport);
        }
        if (plansToImport.length > 0) {
            addPlannedExpensesBatch(plansToImport);
        }

        if (transactionsToImport.length > 0 || plansToImport.length > 0) {
            alert("Backup data imported successfully!");
        } else {
            alert("No data found to import from file.");
        }

      } catch (error) {
        console.error("Failed to parse or process the file:", error);
        alert("Could not import data. The file might be corrupted or in the wrong format.");
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
  
  const plansForDisplay = useMemo(() => {
    const nextMonthDate = new Date(currentDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthString = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

    return plannedExpenses.filter(p => {
        if (p.isRecurring) {
            return true;
        }
        return p.targetMonth === nextMonthString;
    }).sort((a,b) => b.amount - a.amount);
  }, [plannedExpenses, currentDate]);

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
          
          <ExpenseChart transactions={monthlyTransactions} currentDate={currentDate} />
          <Summary totalIncome={totalIncome} totalExpenses={totalExpenses} openingBalance={openingBalance} />

          <NextMonthExpensePlan
            plannedExpenses={plansForDisplay}
            onAddPlan={() => setIsPlanFormModalOpen(true)}
            onDeletePlan={deletePlannedExpense}
          />
        </main>

        <TransactionForm
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          addTransaction={addTransaction}
        />
        <NextMonthExpensePlanForm
          isOpen={isPlanFormModalOpen}
          onClose={() => setIsPlanFormModalOpen(false)}
          addPlannedExpense={addPlannedExpense}
          currentDate={currentDate}
        />
        <TransactionsView
          isOpen={isTransactionsModalOpen}
          onClose={() => setIsTransactionsModalOpen(false)}
          transactions={transactions}
          plannedExpenses={plannedExpenses}
          deleteTransaction={deleteTransaction}
          onDownloadPdf={generateTransactionPdf}
        />
      </div>
    </div>
  );
};

// Fix: Removed duplicate `export` keyword.
export default App;