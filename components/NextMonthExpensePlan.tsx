import React, { useState } from 'react';
import { PlannedExpense } from '../types';
import { PlusIcon, TrashIcon, BellIcon, CalendarDaysIcon, ArrowRightIcon, ArrowPathIcon } from './icons';

interface NextMonthExpensePlanProps {
    plannedExpenses: PlannedExpense[];
    onAddPlan: () => void;
    onDeletePlan: (id: string) => void;
}

const PlannedExpenseItem: React.FC<{ plan: PlannedExpense, onDelete: (id: string) => void }> = ({ plan, onDelete }) => {
    return (
        <li className="flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
            <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    {plan.isRecurring ? <ArrowPathIcon className="w-4 h-4" /> : <CalendarDaysIcon className="w-4 h-4" />}
                </div>
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{plan.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        {plan.isRecurring && <span className="font-semibold text-indigo-500 dark:text-indigo-400">Recurring</span>}
                        {plan.isRecurring && <span className="text-xs">&bull;</span>}
                        {plan.category}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                    {plan.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </span>
                <button onClick={() => onDelete(plan.id)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </li>
    );
};


const NextMonthExpensePlan: React.FC<NextMonthExpensePlanProps> = ({ plannedExpenses, onAddPlan, onDeletePlan }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const totalPlannedAmount = plannedExpenses.reduce((sum, plan) => sum + plan.amount, 0);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className='flex items-center gap-3'>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Future Expense Plans</h3>
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                         <ArrowRightIcon className="w-4 h-4 text-slate-400"/>
                    </div>
                </div>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {totalPlannedAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </span>
            </div>
            
            <div className={`transition-all duration-500 ease-in-out overflow-hidden flex flex-col ${isExpanded ? 'max-h-[60vh] mt-4' : 'max-h-0'}`}>
                <div className="flex-auto overflow-y-auto pr-2">
                    {plannedExpenses.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                            {plannedExpenses.map(plan => (
                                <PlannedExpenseItem key={plan.id} plan={plan} onDelete={onDeletePlan} />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">No expenses planned yet. Get started by adding one!</p>
                    )}
                </div>

                <div className="flex-shrink-0 mt-4 flex justify-end">
                    <button
                        onClick={onAddPlan}
                        className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Add New Plan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NextMonthExpensePlan;