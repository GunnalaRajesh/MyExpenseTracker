
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';
import { SparklesIcon } from './icons';

interface AISummaryProps {
  transactions: Transaction[];
  month: string;
  openingBalance: number;
}

const AISummary: React.FC<AISummaryProps> = ({ transactions, month, openingBalance }) => {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateSummary = async () => {
    if (!process.env.API_KEY) {
        setError("AI summary feature is currently unavailable. Please try again later.");
        console.error("API_KEY is not configured in environment variables.");
        return;
    }

    if (transactions.length === 0) {
      setSummary("There are no transactions for this month to analyze. Add some transactions to get your summary!");
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `You are a friendly and insightful financial assistant. The user started ${month} with an opening balance of ${openingBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}. Based on the following JSON transaction data for ${month}, generate a concise one-paragraph financial summary. The summary should be encouraging and actionable. It must cover: a brief overview of income versus expenses, the total savings or deficit for the month (considering the opening balance for the final closing balance), the top 2-3 spending categories, and provide 1-2 specific, practical suggestions for reducing expenses and improving savings. Keep the tone positive and helpful.
      
      Transaction Data:
      ${JSON.stringify(transactions, ['type', 'category', 'amount', 'description'])}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setSummary(response.text);

    } catch (err) {
      console.error("Error generating AI summary:", err);
      setError("Sorry, I couldn't generate the summary at this time. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">AI Financial Summary</h3>
        <button
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="mt-2 sm:mt-0 flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          aria-label="Generate AI financial summary"
        >
          <SparklesIcon className="w-5 h-5" />
          {isLoading ? 'Generating...' : 'Generate Summary'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400" role="alert">{error}</p>}
      
      {summary && !isLoading && (
        <div className="mt-4 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <p style={{ whiteSpace: 'pre-wrap' }}>{summary}</p>
        </div>
      )}
      
      {!summary && !isLoading && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Click "Generate Summary" to get an AI-powered analysis of your financial activity for {month}.
        </p>
      )}

      {isLoading && (
         <div className="mt-4 text-slate-600 dark:text-slate-300 flex items-center gap-2" aria-live="polite">
            <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-indigo-500"></div>
            <span>Analyzing your transactions...</span>
         </div>
      )}
    </div>
  );
};

export default AISummary;