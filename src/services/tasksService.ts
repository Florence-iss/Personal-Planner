/**
 * Firestore CRUD service for Tasks and Task Categories.
 *
 * Collection paths:
 *   users/{userId}/tasks/{taskId}
 *   users/{userId}/categories/{categoryId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { Task, Category } from '../types';
import { getNextOccurrence, toDateString } from '../utils/recurrenceUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

/** Convert a Firestore doc snapshot into a Task. */
function docToTask(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    userId:                data.userId as string,
    title:                 data.title as string,
    description:           data.description as string | undefined,
    priority:              data.priority as Task['priority'],
    dueDate:               data.dueDate as string | undefined,
    dueTime:               data.dueTime as string | undefined,
    categoryId:            data.categoryId as string | undefined,
    subTasks:              (data.subTasks as Task['subTasks']) ?? [],
    completed:             (data.completed as boolean) ?? false,
    completedAt:           data.completedAt as string | undefined,
    recurring:             data.recurring as Task['recurring'] | undefined,
    googleCalendarEventId: data.googleCalendarEventId as string | undefined,
    createdAt:             data.createdAt as string,
    updatedAt:             data.updatedAt as string,
  };
}

/** Convert a Firestore doc snapshot into a Category. */
function docToCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    userId: data.userId as string,
    name:   data.name as string,
    color:  data.color as string,
    icon:   data.icon as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// Tasks — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all tasks for a user. The listener fires immediately with the
 * current set of tasks and then on every subsequent change.
 *
 * @returns Unsubscribe function — call it when the component unmounts.
 */
export function subscribeToTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void,
): () => void {
  const tasksRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.TASKS);
  const q = query(tasksRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = snapshot.docs.map((d) =>
      docToTask(d.id, d.data() as Record<string, unknown>),
    );
    onUpdate(tasks);
  });
}

// ---------------------------------------------------------------------------
// Tasks — writes
// ---------------------------------------------------------------------------

/**
 * Create a new task under the user's tasks sub-collection.
 */
export async function createTask(
  userId: string,
  data: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<Task> {
  const tasksRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.TASKS);
  const timestamp = now();

  const payload = {
    ...data,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const docRef = await addDoc(tasksRef, payload);

  return {
    id: docRef.id,
    ...payload,
  } as Task;
}

/**
 * Update arbitrary fields on an existing task.
 * Always stamps `updatedAt` with the current time.
 */
export async function updateTask(
  taskId: string,
  data: Partial<Task>,
): Promise<void> {
  // We need the userId to build the correct path.
  // The caller must supply at least `userId` inside `data` when the document
  // is at a user-scoped sub-collection path.  However, to avoid requiring it
  // we use the flat top-level alternative path that some callers may prefer.
  // Because Firestore sub-collection docs require the full path, the doc ref
  // uses the `userId` embedded in `data` if present, otherwise falls back to
  // a Tasks group query.  Here we simply require the caller to pass userId.
  const userId = data.userId;
  if (!userId) {
    throw new Error('updateTask: data.userId is required to resolve the document path.');
  }

  const taskRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.TASKS, taskId);
  const { id: _id, ...rest } = data as Task;
  await updateDoc(taskRef, { ...rest, updatedAt: now() });
}

/**
 * Permanently delete a task.
 */
export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const taskRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.TASKS, taskId);
  await deleteDoc(taskRef);
}

/**
 * Mark a task as completed.
 *
 * If the task has a recurrence rule, a new sibling task document is written
 * with the due date advanced to the next occurrence before the original is
 * marked complete.  This preserves the full history of completed instances.
 */
export async function completeTask(task: Task): Promise<void> {
  const taskRef = doc(
    db,
    COLLECTIONS.USERS,
    task.userId,
    COLLECTIONS.TASKS,
    task.id,
  );
  const completedAt = now();

  // Spawn next occurrence first (before mutating the current doc)
  if (task.recurring && task.dueDate) {
    const nextDate = getNextOccurrence(task.recurring, task.dueDate);
    if (nextDate) {
      const tasksRef = collection(
        db,
        COLLECTIONS.USERS,
        task.userId,
        COLLECTIONS.TASKS,
      );
      const newTask: Omit<Task, 'id'> = {
        userId:    task.userId,
        title:     task.title,
        description: task.description,
        priority:  task.priority,
        dueDate:   toDateString(nextDate),
        dueTime:   task.dueTime,
        categoryId: task.categoryId,
        subTasks:  task.subTasks.map((st) => ({ ...st, completed: false })),
        completed: false,
        recurring: task.recurring,
        googleCalendarEventId: task.googleCalendarEventId,
        createdAt: completedAt,
        updatedAt: completedAt,
      };
      await addDoc(tasksRef, newTask);
    }
  }

  await updateDoc(taskRef, {
    completed:  true,
    completedAt,
    updatedAt:  completedAt,
  });
}

// ---------------------------------------------------------------------------
// Categories — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all categories for a user.
 *
 * @returns Unsubscribe function.
 */
export function subscribeToCategories(
  userId: string,
  callback: (categories: Category[]) => void,
): () => void {
  const catRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CATEGORIES,
  );
  const q = query(catRef, orderBy('name', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const categories: Category[] = snapshot.docs.map((d) =>
      docToCategory(d.id, d.data() as Record<string, unknown>),
    );
    callback(categories);
  });
}

// ---------------------------------------------------------------------------
// Categories — writes
// ---------------------------------------------------------------------------

/**
 * Create a new task category.
 */
export async function createCategory(
  userId: string,
  data: Omit<Category, 'id' | 'userId'>,
): Promise<Category> {
  const catRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CATEGORIES,
  );
  const payload = { ...data, userId };
  const docRef = await addDoc(catRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Update fields on an existing category.
 */
export async function updateCategory(
  categoryId: string,
  data: Partial<Category>,
): Promise<void> {
  const userId = data.userId;
  if (!userId) {
    throw new Error('updateCategory: data.userId is required.');
  }
  const catRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CATEGORIES,
    categoryId,
  );
  const { id: _id, ...rest } = data as Category;
  await updateDoc(catRef, rest);
}

/**
 * Permanently delete a category.
 */
export async function deleteCategory(
  categoryId: string,
  userId: string,
): Promise<void> {
  const catRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CATEGORIES,
    categoryId,
  );
  await deleteDoc(catRef);
}
