
import React, { useState } from 'react';
import { PlannedExpense, Category } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { XMarkIcon } from './icons';

interface NextMonthExpensePlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  addPlannedExpense: (plan: Omit<PlannedExpense, 'id'>) => void;
  currentDate: Date;
}

const NextMonthExpensePlanForm: React.FC<NextMonthExpensePlanFormProps> = ({ isOpen, onClose, addPlannedExpense, currentDate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(EXPENSE_CATEGORIES[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isReminderSet, setIsReminderSet] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setIsRecurring(false);
    setIsReminderSet(false);
    setReminderDate('');
    setReminderTime('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) newErrors.amount = "Please enter a positive amount.";
    if (!category) newErrors.category = "Please select a category.";
    
    if (isReminderSet) {
      if (!reminderDate) newErrors.reminderDate = "Date is required for a reminder.";
      if (!reminderTime) newErrors.reminderTime = "Time is required for a reminder.";
      if (reminderDate && reminderTime) {
        const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
        if (reminderDateTime <= new Date()) {
          newErrors.reminderDateTime = "Reminder must be set for a future date and time.";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    if (isReminderSet && 'Notification' in window && Notification.permission === 'denied') {
        alert("Notifications are disabled. Please enable them in your browser settings to receive reminders.");
    }
    
    const nextMonthDate = new Date(currentDate);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const targetMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

    addPlannedExpense({
      title,
      description,
      amount: parseFloat(amount),
      category,
      isRecurring,
      targetMonth: !isRecurring ? targetMonth : undefined,
      isReminderSet,
      reminderDateTime: isReminderSet ? new Date(`${reminderDate}T${reminderTime}`).toISOString() : undefined,
      notificationShown: false,
    });
    
    handleClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={handleClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Add New Expense Plan</h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <XMarkIcon className="w-6 h-6"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="plan-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <input id="plan-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Monthly Rent" required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="plan-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description (Optional)</label>
            <textarea id="plan-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Payment for upcoming month" rows={2} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expected Amount (₹)</label>
              <input id="plan-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200" />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label htmlFor="plan-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
              <select id="plan-category" value={category} onChange={(e) => setCategory(e.target.value as Category)} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-slate-800 dark:text-slate-200">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
          </div>
          <label className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md cursor-pointer">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Recurring Monthly Plan</span>
            <div className="relative inline-flex items-center">
              <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={() => setIsRecurring(!isRecurring)} />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
          </label>
          <label className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md cursor-pointer">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Set Reminder</span>
            <div className="relative inline-flex items-center">
              <input type="checkbox" className="sr-only peer" checked={isReminderSet} onChange={() => setIsReminderSet(!isReminderSet)} />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
          </label>

          {isReminderSet && (
            <div className="grid grid-cols-2 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-md">
              <div>
                <label htmlFor="reminder-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                <input id="reminder-date" type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200" />
                {errors.reminderDate && <p className="text-red-500 text-xs mt-1">{errors.reminderDate}</p>}
              </div>
              <div>
                <label htmlFor="reminder-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Time</label>
                <input id="reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-800 dark:text-slate-200" />
                 {errors.reminderTime && <p className="text-red-500 text-xs mt-1">{errors.reminderTime}</p>}
              </div>
              {errors.reminderDateTime && <p className="col-span-2 text-red-500 text-xs mt-1">{errors.reminderDateTime}</p>}
            </div>
          )}
          
          <div className="flex justify-end pt-2 gap-2">
            <button type="button" onClick={handleClose} className="bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold py-2 px-4 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
              Cancel
            </button>
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
              Save Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NextMonthExpensePlanForm;
