// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type Priority = 'high' | 'medium' | 'low';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Defines how a task or event repeats.
 * - `frequency`: cadence type
 * - `interval`: every N units (e.g. every 2 weeks → frequency=weekly, interval=2)
 * - `days`: days-of-week bitmask indices (0=Sun … 6=Sat) used when frequency is 'weekly' or 'custom'
 * - `until`: ISO 8601 date string after which recurrence stops (optional)
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  days: number[];
  until?: string; // ISO date string e.g. '2025-12-31'
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string; // ISO date string 'YYYY-MM-DD'
  dueTime?: string; // 'HH:mm' 24-hour
  categoryId?: string;
  subTasks: SubTask[];
  completed: boolean;
  completedAt?: string; // ISO timestamp
  recurring?: RecurrenceRule;
  googleCalendarEventId?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// ---------------------------------------------------------------------------
// Categories (for tasks)
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string; // hex color
  icon?: string; // icon name from @expo/vector-icons
}

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string; // ISO timestamp
  endTime: string;   // ISO timestamp
  allDay: boolean;
  recurring?: RecurrenceRule;
  googleCalendarEventId?: string;
  googleCalendarId?: string;
  color: string; // hex color
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon: string;   // icon name from @expo/vector-icons
  color: string;  // hex color
  frequency: HabitFrequency;
  /** Days of week when the habit is required (0=Sun … 6=Sat). Empty means every day for 'daily'. */
  targetDays: number[];
  /** Times per target period the habit should be completed (default 1) */
  targetCount: number;
  createdAt: string;
  archivedAt?: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  /** Date string in 'YYYY-MM-DD' format */
  date: string;
  completedAt: string; // ISO timestamp
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export type TransactionType = 'income' | 'expense';

export type TransactionSource = 'sms' | 'email' | 'manual';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string; // ISO 4217 e.g. 'USD'
  categoryId: string;
  description: string;
  /** Date string 'YYYY-MM-DD' */
  date: string;
  source: TransactionSource;
  /** Raw SMS/email text from which this was parsed */
  rawText?: string;
  /** False while waiting for user to confirm an auto-parsed transaction */
  confirmed: boolean;
  createdAt: string;
}

export interface FinanceCategory {
  id: string;
  userId: string;
  type: TransactionType;
  name: string;
  icon: string;  // icon name
  color: string; // hex color
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  currency: string;
  /** 'YYYY-MM' month identifier */
  month: string;
}

/**
 * A pattern used to parse transactions from SMS/email text.
 * `regex` is a string that will be compiled to RegExp.
 * `fieldMap` maps named capture groups → transaction fields.
 */
export interface SmsPattern {
  id: string;
  userId: string;
  name: string;
  regex: string;
  fieldMap: {
    amount: string;        // capture group name for amount
    type: string;          // capture group name for income/expense indicator
    description?: string;  // capture group name for description
    date?: string;         // capture group name for date
  };
}

// ---------------------------------------------------------------------------
// Navigation param lists
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  /** Full-screen modal routes */
  TaskDetail: { taskId: string };
  TaskCreate: { defaultDate?: string };
  EventDetail: { eventId: string };
  EventCreate: { defaultDate?: string; defaultTime?: string };
  HabitDetail: { habitId: string };
  HabitCreate: undefined;
  TransactionDetail: { transactionId: string };
  TransactionCreate: { type?: TransactionType };
  BudgetCreate: { month?: string };
  CategoryCreate: { type?: 'task' | TransactionType };
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Calendar: undefined;
  Habits: undefined;
  Finance: undefined;
  Settings: undefined;
};

export type TasksStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
  TaskCreate: { defaultDate?: string };
};

export type CalendarStackParamList = {
  CalendarView: undefined;
  EventDetail: { eventId: string };
  EventCreate: { defaultDate?: string; defaultTime?: string };
};

export type HabitsStackParamList = {
  HabitList: undefined;
  HabitDetail: { habitId: string };
  HabitCreate: undefined;
};

export type FinanceStackParamList = {
  FinanceDashboard: undefined;
  TransactionList: undefined;
  TransactionDetail: { transactionId: string };
  TransactionCreate: { type?: TransactionType };
  BudgetList: undefined;
  BudgetCreate: { month?: string };
  SmsPatterns: undefined;
  FinanceCategories: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ProfileEdit: undefined;
  NotificationSettings: undefined;
  CurrencySettings: undefined;
  GoogleCalendarSync: undefined;
};

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/** Omit 'id' | 'createdAt' | 'updatedAt' | 'userId' for create payloads */
export type CreatePayload<T extends { id: string; userId: string; createdAt: string }> = Omit<
  T,
  'id' | 'userId' | 'createdAt'
>;

/** Partial of everything except id for update payloads */
export type UpdatePayload<T extends { id: string }> = Partial<Omit<T, 'id'>> & { id: string };
