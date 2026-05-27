import { create } from 'zustand';
import { Task, Category } from '../types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface TasksState {
  tasks: Task[];
  categories: Category[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface TasksActions {
  // ---- loading ----
  setLoading: (loading: boolean) => void;

  // ---- tasks ----
  /** Replace the entire task list (e.g. after fetching from Firestore). */
  setTasks: (tasks: Task[]) => void;
  /** Append a new task to the list. */
  addTask: (task: Task) => void;
  /** Merge updated fields into an existing task matched by id. */
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
  /** Remove a task by id. */
  removeTask: (id: string) => void;

  // ---- categories ----
  /** Replace the entire category list. */
  setCategories: (categories: Category[]) => void;
  /** Append a new category. */
  addCategory: (category: Category) => void;
  /** Merge updated fields into an existing category matched by id. */
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  /** Remove a category by id. */
  removeCategory: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTasksStore = create<TasksState & TasksActions>((set) => ({
  // --- initial state ---
  tasks: [],
  categories: [],
  loading: false,

  // --- loading ---
  setLoading: (loading) => set({ loading }),

  // --- tasks ---
  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    })),

  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  // --- categories ---
  setCategories: (categories) => set({ categories }),

  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),

  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  removeCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Tasks due on a specific date string ('YYYY-MM-DD'). */
export const selectTasksByDate =
  (date: string) =>
  (state: TasksState): Task[] =>
    state.tasks.filter((t) => t.dueDate === date);

/** Tasks for a given category id. */
export const selectTasksByCategory =
  (categoryId: string) =>
  (state: TasksState): Task[] =>
    state.tasks.filter((t) => t.categoryId === categoryId);

/** Incomplete tasks only. */
export const selectPendingTasks = (state: TasksState): Task[] =>
  state.tasks.filter((t) => !t.completed);

/** Completed tasks only. */
export const selectCompletedTasks = (state: TasksState): Task[] =>
  state.tasks.filter((t) => t.completed);

/** Tasks by priority. */
export const selectTasksByPriority =
  (priority: Task['priority']) =>
  (state: TasksState): Task[] =>
    state.tasks.filter((t) => t.priority === priority);

/** Find a category by id. */
export const selectCategoryById =
  (id: string) =>
  (state: TasksState): Category | undefined =>
    state.categories.find((c) => c.id === id);
