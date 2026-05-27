import { create } from 'zustand';
import {
  Transaction,
  FinanceCategory,
  Budget,
  SmsPattern,
  TransactionType,
} from '../types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface FinanceState {
  transactions: Transaction[];
  financeCategories: FinanceCategory[];
  budgets: Budget[];
  smsPatterns: SmsPattern[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface FinanceActions {
  // ---- loading ----
  setLoading: (loading: boolean) => void;

  // ---- transactions ----
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
  removeTransaction: (id: string) => void;

  // ---- finance categories ----
  setFinanceCategories: (categories: FinanceCategory[]) => void;
  addFinanceCategory: (category: FinanceCategory) => void;
  updateFinanceCategory: (id: string, updates: Partial<Omit<FinanceCategory, 'id'>>) => void;
  removeFinanceCategory: (id: string) => void;

  // ---- budgets ----
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Omit<Budget, 'id'>>) => void;
  removeBudget: (id: string) => void;

  // ---- SMS patterns ----
  setSmsPatterns: (patterns: SmsPattern[]) => void;
  addSmsPattern: (pattern: SmsPattern) => void;
  updateSmsPattern: (id: string, updates: Partial<Omit<SmsPattern, 'id'>>) => void;
  removeSmsPattern: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFinanceStore = create<FinanceState & FinanceActions>((set) => ({
  // --- initial state ---
  transactions: [],
  financeCategories: [],
  budgets: [],
  smsPatterns: [],
  loading: false,

  // --- loading ---
  setLoading: (loading) => set({ loading }),

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------
  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (transaction) =>
    set((state) => ({ transactions: [...state.transactions, transaction] })),

  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    })),

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  // -------------------------------------------------------------------------
  // Finance Categories
  // -------------------------------------------------------------------------
  setFinanceCategories: (financeCategories) => set({ financeCategories }),

  addFinanceCategory: (category) =>
    set((state) => ({
      financeCategories: [...state.financeCategories, category],
    })),

  updateFinanceCategory: (id, updates) =>
    set((state) => ({
      financeCategories: state.financeCategories.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  removeFinanceCategory: (id) =>
    set((state) => ({
      financeCategories: state.financeCategories.filter((c) => c.id !== id),
    })),

  // -------------------------------------------------------------------------
  // Budgets
  // -------------------------------------------------------------------------
  setBudgets: (budgets) => set({ budgets }),

  addBudget: (budget) =>
    set((state) => ({ budgets: [...state.budgets, budget] })),

  updateBudget: (id, updates) =>
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      ),
    })),

  removeBudget: (id) =>
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    })),

  // -------------------------------------------------------------------------
  // SMS Patterns
  // -------------------------------------------------------------------------
  setSmsPatterns: (smsPatterns) => set({ smsPatterns }),

  addSmsPattern: (pattern) =>
    set((state) => ({ smsPatterns: [...state.smsPatterns, pattern] })),

  updateSmsPattern: (id, updates) =>
    set((state) => ({
      smsPatterns: state.smsPatterns.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    })),

  removeSmsPattern: (id) =>
    set((state) => ({
      smsPatterns: state.smsPatterns.filter((p) => p.id !== id),
    })),
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** All unconfirmed transactions (auto-parsed, awaiting user confirmation). */
export const selectUnconfirmedTransactions = (state: FinanceState): Transaction[] =>
  state.transactions.filter((t) => !t.confirmed);

/** Transactions for a specific month ('YYYY-MM'). */
export const selectTransactionsByMonth =
  (month: string) =>
  (state: FinanceState): Transaction[] =>
    state.transactions.filter((t) => t.date.startsWith(month));

/** Income transactions only. */
export const selectIncomeTransactions = (state: FinanceState): Transaction[] =>
  state.transactions.filter((t) => t.type === 'income');

/** Expense transactions only. */
export const selectExpenseTransactions = (state: FinanceState): Transaction[] =>
  state.transactions.filter((t) => t.type === 'expense');

/** Transactions for a specific category. */
export const selectTransactionsByCategory =
  (categoryId: string) =>
  (state: FinanceState): Transaction[] =>
    state.transactions.filter((t) => t.categoryId === categoryId);

/** Finance categories filtered by transaction type. */
export const selectCategoriesByType =
  (type: TransactionType) =>
  (state: FinanceState): FinanceCategory[] =>
    state.financeCategories.filter((c) => c.type === type);

/** Find a finance category by id. */
export const selectFinanceCategoryById =
  (id: string) =>
  (state: FinanceState): FinanceCategory | undefined =>
    state.financeCategories.find((c) => c.id === id);

/** Budget for a specific category + month combination. */
export const selectBudgetForCategoryMonth =
  (categoryId: string, month: string) =>
  (state: FinanceState): Budget | undefined =>
    state.budgets.find(
      (b) => b.categoryId === categoryId && b.month === month,
    );

/** All budgets for a given month ('YYYY-MM'). */
export const selectBudgetsByMonth =
  (month: string) =>
  (state: FinanceState): Budget[] =>
    state.budgets.filter((b) => b.month === month);

/**
 * Aggregate summary for a given month.
 * Returns { totalIncome, totalExpense, netBalance } for confirmed transactions.
 */
export const selectMonthlySummary =
  (month: string) =>
  (state: FinanceState): { totalIncome: number; totalExpense: number; netBalance: number } => {
    const monthlyTxns = state.transactions.filter(
      (t) => t.confirmed && t.date.startsWith(month),
    );

    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of monthlyTxns) {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    }

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    };
  };

/**
 * Total spending by category for a given month.
 * Returns a map of categoryId → total amount (expenses only).
 */
export const selectSpendingByCategory =
  (month: string) =>
  (state: FinanceState): Record<string, number> => {
    const result: Record<string, number> = {};

    state.transactions
      .filter((t) => t.confirmed && t.type === 'expense' && t.date.startsWith(month))
      .forEach((t) => {
        result[t.categoryId] = (result[t.categoryId] ?? 0) + t.amount;
      });

    return result;
  };
