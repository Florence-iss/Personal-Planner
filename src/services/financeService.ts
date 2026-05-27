/**
 * Firestore CRUD service for Finance: Transactions, Finance Categories,
 * Budgets, and SMS/Email Patterns.
 *
 * Collection paths:
 *   users/{userId}/transactions/{txId}
 *   users/{userId}/financeCategories/{catId}
 *   users/{userId}/budgets/{budgetId}
 *   users/{userId}/smsPatterns/{patternId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import {
  Transaction,
  FinanceCategory,
  Budget,
  SmsPattern,
  TransactionType,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function docToTransaction(id: string, data: Record<string, unknown>): Transaction {
  return {
    id,
    userId:      data.userId as string,
    type:        data.type as TransactionType,
    amount:      data.amount as number,
    currency:    data.currency as string,
    categoryId:  data.categoryId as string,
    description: data.description as string,
    date:        data.date as string,
    source:      data.source as Transaction['source'],
    rawText:     data.rawText as string | undefined,
    confirmed:   (data.confirmed as boolean) ?? true,
    createdAt:   data.createdAt as string,
  };
}

function docToFinanceCategory(id: string, data: Record<string, unknown>): FinanceCategory {
  return {
    id,
    userId: data.userId as string,
    type:   data.type as TransactionType,
    name:   data.name as string,
    icon:   data.icon as string,
    color:  data.color as string,
  };
}

function docToBudget(id: string, data: Record<string, unknown>): Budget {
  return {
    id,
    userId:     data.userId as string,
    categoryId: data.categoryId as string,
    amount:     data.amount as number,
    currency:   data.currency as string,
    month:      data.month as string,
  };
}

function docToSmsPattern(id: string, data: Record<string, unknown>): SmsPattern {
  return {
    id,
    userId:   data.userId as string,
    name:     data.name as string,
    regex:    data.regex as string,
    fieldMap: data.fieldMap as SmsPattern['fieldMap'],
  };
}

// ---------------------------------------------------------------------------
// Transactions — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all transactions for a user in a given month.
 *
 * @param month - 'YYYY-MM' string, e.g. '2025-06'
 * @returns Unsubscribe function.
 */
export function subscribeToTransactions(
  userId: string,
  month: string,
  callback: (transactions: Transaction[]) => void,
): () => void {
  const txRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.TRANSACTIONS);

  const monthStart = `${month}-01`;
  const monthEnd   = `${month}-31`;

  const q = query(
    txRef,
    where('date', '>=', monthStart),
    where('date', '<=', monthEnd),
    orderBy('date', 'desc'),
  );

  return onSnapshot(q, (snapshot) => {
    const transactions: Transaction[] = snapshot.docs.map((d) =>
      docToTransaction(d.id, d.data() as Record<string, unknown>),
    );
    callback(transactions);
  });
}

// ---------------------------------------------------------------------------
// Transactions — writes
// ---------------------------------------------------------------------------

/**
 * Create a new transaction.
 */
export async function createTransaction(
  userId: string,
  data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>,
): Promise<Transaction> {
  const txRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.TRANSACTIONS);
  const timestamp = now();
  const payload = { ...data, userId, createdAt: timestamp };
  const docRef = await addDoc(txRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Update fields on an existing transaction.
 * `data.userId` must be present to resolve the Firestore path.
 */
export async function updateTransaction(
  txId: string,
  data: Partial<Transaction>,
): Promise<void> {
  const userId = data.userId;
  if (!userId) {
    throw new Error('updateTransaction: data.userId is required.');
  }
  const txRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.TRANSACTIONS, txId);
  const { id: _id, ...rest } = data as Transaction;
  await updateDoc(txRef, rest);
}

/**
 * Permanently delete a transaction.
 */
export async function deleteTransaction(txId: string, userId: string): Promise<void> {
  const txRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.TRANSACTIONS, txId);
  await deleteDoc(txRef);
}

// ---------------------------------------------------------------------------
// Finance Categories — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all finance categories for a user.
 *
 * @returns Unsubscribe function.
 */
export function subscribeToFinanceCategories(
  userId: string,
  callback: (categories: FinanceCategory[]) => void,
): () => void {
  const catRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.FINANCE_CATEGORIES,
  );
  const q = query(catRef, orderBy('name', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const categories: FinanceCategory[] = snapshot.docs.map((d) =>
      docToFinanceCategory(d.id, d.data() as Record<string, unknown>),
    );
    callback(categories);
  });
}

// ---------------------------------------------------------------------------
// Finance Categories — writes
// ---------------------------------------------------------------------------

/**
 * Create a new finance category.
 */
export async function createFinanceCategory(
  userId: string,
  data: Omit<FinanceCategory, 'id' | 'userId'>,
): Promise<FinanceCategory> {
  const catRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.FINANCE_CATEGORIES,
  );
  const payload = { ...data, userId };
  const docRef = await addDoc(catRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Update fields on an existing finance category.
 * `data.userId` must be present to resolve the Firestore path.
 */
export async function updateFinanceCategory(
  catId: string,
  data: Partial<FinanceCategory>,
): Promise<void> {
  const userId = data.userId;
  if (!userId) {
    throw new Error('updateFinanceCategory: data.userId is required.');
  }
  const catRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.FINANCE_CATEGORIES,
    catId,
  );
  const { id: _id, ...rest } = data as FinanceCategory;
  await updateDoc(catRef, rest);
}

/**
 * Permanently delete a finance category.
 */
export async function deleteFinanceCategory(catId: string, userId: string): Promise<void> {
  const catRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.FINANCE_CATEGORIES,
    catId,
  );
  await deleteDoc(catRef);
}

// ---------------------------------------------------------------------------
// Budgets — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all budgets for a user in a given month.
 *
 * @param month - 'YYYY-MM' string, e.g. '2025-06'
 * @returns Unsubscribe function.
 */
export function subscribeToBudgets(
  userId: string,
  month: string,
  callback: (budgets: Budget[]) => void,
): () => void {
  const budgetsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.BUDGETS);
  const q = query(budgetsRef, where('month', '==', month), orderBy('categoryId', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const budgets: Budget[] = snapshot.docs.map((d) =>
      docToBudget(d.id, d.data() as Record<string, unknown>),
    );
    callback(budgets);
  });
}

// ---------------------------------------------------------------------------
// Budgets — writes
// ---------------------------------------------------------------------------

/**
 * Create or update the budget for a given (userId, categoryId, month) triple.
 *
 * If a budget document already exists for that combination it is updated in
 * place; otherwise a new document is created.  Returns the final Budget.
 */
export async function upsertBudget(
  userId: string,
  categoryId: string,
  month: string,
  amount: number,
  currency: string,
): Promise<Budget> {
  const budgetsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.BUDGETS);

  // Check whether a budget already exists for this category + month
  const existingQuery = query(
    budgetsRef,
    where('categoryId', '==', categoryId),
    where('month', '==', month),
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    await updateDoc(existingDoc.ref, { amount, currency });
    return docToBudget(existingDoc.id, {
      ...existingDoc.data(),
      amount,
      currency,
    } as Record<string, unknown>);
  }

  // Create new
  const payload: Omit<Budget, 'id'> = { userId, categoryId, month, amount, currency };
  const docRef = await addDoc(budgetsRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Permanently delete a budget.
 */
export async function deleteBudget(budgetId: string, userId: string): Promise<void> {
  const budgetRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.BUDGETS, budgetId);
  await deleteDoc(budgetRef);
}

// ---------------------------------------------------------------------------
// SMS / Email Patterns — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all SMS/email parsing patterns for a user.
 *
 * @returns Unsubscribe function.
 */
export function subscribeToSmsPatterns(
  userId: string,
  callback: (patterns: SmsPattern[]) => void,
): () => void {
  const patternsRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.SMS_PATTERNS,
  );
  const q = query(patternsRef, orderBy('name', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const patterns: SmsPattern[] = snapshot.docs.map((d) =>
      docToSmsPattern(d.id, d.data() as Record<string, unknown>),
    );
    callback(patterns);
  });
}

// ---------------------------------------------------------------------------
// SMS / Email Patterns — writes
// ---------------------------------------------------------------------------

/**
 * Create a new SMS/email parsing pattern.
 */
export async function createSmsPattern(
  userId: string,
  data: Omit<SmsPattern, 'id' | 'userId'>,
): Promise<SmsPattern> {
  const patternsRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.SMS_PATTERNS,
  );
  const payload = { ...data, userId };
  const docRef = await addDoc(patternsRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Update fields on an existing pattern.
 * `data.userId` must be present to resolve the Firestore path.
 */
export async function updateSmsPattern(
  patternId: string,
  data: Partial<SmsPattern>,
): Promise<void> {
  const userId = data.userId;
  if (!userId) {
    throw new Error('updateSmsPattern: data.userId is required.');
  }
  const patternRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.SMS_PATTERNS,
    patternId,
  );
  const { id: _id, ...rest } = data as SmsPattern;
  await updateDoc(patternRef, rest);
}

/**
 * Permanently delete an SMS/email pattern.
 */
export async function deleteSmsPattern(patternId: string, userId: string): Promise<void> {
  const patternRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.SMS_PATTERNS,
    patternId,
  );
  await deleteDoc(patternRef);
}

// ---------------------------------------------------------------------------
// Analytics helpers (pure — no Firestore calls)
// ---------------------------------------------------------------------------

export interface MonthSummary {
  totalIncome:   number;
  totalExpenses: number;
  netBalance:    number;
  /** Signed net amount per categoryId (positive = income, negative = expense) */
  byCategory:    Record<string, number>;
}

/**
 * Compute income/expense totals and a per-category breakdown from a list of
 * transactions.  All amounts are treated as positive; type determines sign.
 *
 * Returns `netBalance = totalIncome - totalExpenses`.
 */
export function getMonthSummary(transactions: Transaction[]): MonthSummary {
  let totalIncome   = 0;
  let totalExpenses = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of transactions) {
    const isIncome = tx.type === 'income';

    if (isIncome) {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }

    const sign  = isIncome ? 1 : -1;
    const prior = byCategory[tx.categoryId] ?? 0;
    byCategory[tx.categoryId] = prior + sign * tx.amount;
  }

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    byCategory,
  };
}
