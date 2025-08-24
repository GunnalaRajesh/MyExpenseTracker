import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, TransactionType } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Summary from './components/Summary';
import ExpenseChart from './components/ExpenseChart';
import TransactionForm from './components/TransactionForm';
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, ListBulletIcon, UploadIcon } from './components/icons';
import TransactionsView from './components/TransactionsView';

const App: React.FC = () => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [lastAutoDownload, setLastAutoDownload] = useLocalStorage<string>('lastAutoDownload', '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
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
    
    // Use a timeout to avoid interrupting the user immediately on app load.
    const timerId = setTimeout(checkAndAutoDownload, 5000); 

    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on initial mount


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
          
          <ExpenseChart transactions={monthlyTransactions} currentDate={currentDate} />
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
          onDownloadPdf={generateTransactionPdf}
        />
      </div>
    </div>
  );
};

export default App;