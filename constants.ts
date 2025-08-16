
import { Category } from './types';

export const EXPENSE_CATEGORIES: Category[] = [
  Category.FOOD,
  Category.TRANSPORTATION,
  Category.HOUSING,
  Category.UTILITIES,
  Category.ENTERTAINMENT,
  Category.HEALTHCARE,
  Category.SHOPPING,
  Category.OTHER_EXPENSE,
];

export const INCOME_CATEGORIES: Category[] = [
  Category.SALARY,
  Category.FREELANCE,
  Category.INVESTMENTS,
  Category.GIFTS,
  Category.OTHER_INCOME,
];

export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];