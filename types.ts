

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum Category {
  // Expenses
  FOOD = 'Food',
  TRANSPORTATION = 'Transportation',
  HOUSING = 'Housing',
  UTILITIES = 'Utilities',
  ENTERTAINMENT = 'Entertainment',
  HEALTHCARE = 'Healthcare',
  SHOPPING = 'Shopping',
  OTHER_EXPENSE = 'Other',
  
  // Income
  SALARY = 'Salary',
  FREELANCE = 'Freelance',
  INVESTMENTS = 'Investments',
  GIFTS = 'Gifts',
  OTHER_INCOME = 'Other',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: Category;
  amount: number;
  description: string;
  date: string; // ISO 8601 format: YYYY-MM-DD
}

export interface PlannedExpense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: Category;
  isRecurring: boolean;
  targetMonth?: string; // YYYY-MM format
}