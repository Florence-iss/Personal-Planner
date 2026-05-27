/**
 * TaskDetailScreen — full detail view for a single task.
 *
 * Loads task from the Zustand store by taskId (hydrated by TasksScreen's
 * Firestore subscription). Shows all task metadata, sub-task checklist,
 * recurrence info, and provides Mark Complete / Edit / Delete actions.
 */

import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { SubTask, Task } from '../../types';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import {
  completeTask,
  deleteTask,
  updateTask as svcUpdateTask,
} from '../../services/tasksService';
import { formatDate, getRelativeDayLabel } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { TasksStackParamList } from '../../navigation/stacks/TasksStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Nav = StackNavigationProp<TasksStackParamList, 'TaskDetail'>;
type Route = RouteProp<TasksStackParamList, 'TaskDetail'>;

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------

function priorityColor(p: Task['priority']): string {
  switch (p) {
    case 'high':   return colors.priorityHigh;
    case 'medium': return colors.priorityMedium;
    case 'low':    return colors.priorityLow;
  }
}

function priorityBgColor(p: Task['priority']): string {
  switch (p) {
    case 'high':   return colors.errorLight;
    case 'medium': return colors.warningLight;
    case 'low':    return colors.successLight;
  }
}

function priorityLabel(p: Task['priority']): string {
  switch (p) {
    case 'high':   return 'High Priority';
    case 'medium': return 'Medium Priority';
    case 'low':    return 'Low Priority';
  }
}

// ---------------------------------------------------------------------------
// Format recurrence
// ---------------------------------------------------------------------------

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRecurrence(task: Task): string {
  const rule = task.recurring;
  if (!rule) return '';
  switch (rule.frequency) {
    case 'daily':
      return 'Repeats daily';
    case 'weekly': {
      if (rule.days.length === 0) return 'Repeats weekly';
      const dayNames = rule.days.map((d) => SHORT_DAY_NAMES[d]).join(', ');
      return `Repeats weekly on ${dayNames}`;
    }
    case 'monthly':
      return 'Repeats monthly';
    case 'custom':
      return 'Custom recurrence';
    default:
      return 'Repeating task';
  }
}

// ---------------------------------------------------------------------------
// Format time display (HH:mm → 9:30 AM)
// ---------------------------------------------------------------------------

function formatTimeDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ---------------------------------------------------------------------------
// Sub-task row
// ---------------------------------------------------------------------------

interface SubTaskRowProps {
  subTask: SubTask;
  onToggle: (id: string, completed: boolean) => void;
}

function SubTaskRow({ subTask, onToggle }: SubTaskRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={subTaskStyles.row}
      onPress={() => onToggle(subTask.id, !subTask.completed)}
      activeOpacity={0.75}
    >
      <View
        style={[
          subTaskStyles.checkbox,
          subTask.completed && subTaskStyles.checkboxDone,
        ]}
      >
        {subTask.completed && (
          <Ionicons name="checkmark" size={11} color={colors.white} />
        )}
      </View>
      <Text
        style={[
          subTaskStyles.label,
          subTask.completed && subTaskStyles.labelDone,
        ]}
        numberOfLines={3}
      >
        {subTask.title}
      </Text>
    </TouchableOpacity>
  );
}

const subTaskStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  labelDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
});

// ---------------------------------------------------------------------------
// Meta row
// ---------------------------------------------------------------------------

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={metaStyles.row}>
      <View style={metaStyles.labelWrap}>
        <Ionicons name={icon} size={15} color={colors.textMuted} />
        <Text style={metaStyles.label}>{label}</Text>
      </View>
      <View style={metaStyles.value}>{children}</View>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 1,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  value: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TaskDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { taskId } = route.params;

  // Store
  const { tasks, categories, updateTask: storeUpdateTask, removeTask } = useTasksStore();
  const user = useAuthStore((s) => s.user);

  // Local optimistic sub-task state
  const task = useMemo(
    () => tasks.find((t) => t.id === taskId) ?? null,
    [tasks, taskId],
  );

  const [actionLoading, setActionLoading] = useState<
    'complete' | 'delete' | null
  >(null);

  const category = useMemo(
    () => (task?.categoryId ? categories.find((c) => c.id === task.categoryId) : undefined),
    [task, categories],
  );

  // ── Navigation header ─────────────────────────────────────────────────────

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Task Details',
      headerRight: () =>
        task ? (
          <TouchableOpacity
            onPress={handleEdit}
            style={navStyles.editBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleEdit = useCallback(() => {
    if (!task) return;
    navigation.navigate('CreateTask', { task });
  }, [navigation, task]);

  const handleToggleComplete = useCallback(async () => {
    if (!task || !user?.uid) return;
    setActionLoading('complete');
    try {
      if (task.completed) {
        // Mark incomplete
        await svcUpdateTask(task.id, {
          ...task,
          userId: user.uid,
          completed: false,
          completedAt: undefined,
        });
        storeUpdateTask(task.id, { completed: false, completedAt: undefined });
      } else {
        await completeTask(task);
        storeUpdateTask(task.id, {
          completed: true,
          completedAt: new Date().toISOString(),
        });
      }
    } catch {
      Alert.alert('Error', 'Could not update the task. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [task, user?.uid, storeUpdateTask]);

  const handleSubTaskToggle = useCallback(
    async (subTaskId: string, completed: boolean) => {
      if (!task || !user?.uid) return;
      const updatedSubTasks = task.subTasks.map((st) =>
        st.id === subTaskId ? { ...st, completed } : st,
      );
      // Optimistic update
      storeUpdateTask(task.id, { subTasks: updatedSubTasks });
      try {
        await svcUpdateTask(task.id, {
          userId: user.uid,
          subTasks: updatedSubTasks,
        });
      } catch {
        // Roll back
        storeUpdateTask(task.id, { subTasks: task.subTasks });
        Alert.alert('Error', 'Could not update sub-task.');
      }
    },
    [task, user?.uid, storeUpdateTask],
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to permanently delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!task || !user?.uid) return;
            setActionLoading('delete');
            try {
              removeTask(task.id);
              await deleteTask(task.id, user.uid);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Could not delete the task.');
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, [task, user?.uid, removeTask, navigation]);

  // ── Loading / not found ───────────────────────────────────────────────────

  if (!task) {
    return <LoadingSpinner fullScreen message="Loading task…" />;
  }

  // ── Computed display values ───────────────────────────────────────────────

  const dueDateLabel = task.dueDate
    ? getRelativeDayLabel(task.dueDate + 'T00:00:00', 'EEE, MMM d, yyyy')
    : null;

  const completedSubCount = task.subTasks.filter((s) => s.completed).length;
  const totalSubCount = task.subTasks.length;

  const recurrenceLabel = task.recurring ? formatRecurrence(task) : null;

  const isOverdue =
    !task.completed &&
    !!task.dueDate &&
    (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(task.dueDate + 'T00:00:00');
      return due < today;
    })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Title card ── */}
        <View style={[styles.card, styles.titleCard]}>
          {/* Completion circle */}
          <TouchableOpacity
            style={[
              styles.completionCircle,
              task.completed && styles.completionCircleDone,
            ]}
            onPress={handleToggleComplete}
            disabled={actionLoading === 'complete'}
            activeOpacity={0.8}
          >
            {task.completed ? (
              <Ionicons name="checkmark" size={18} color={colors.white} />
            ) : null}
          </TouchableOpacity>

          <View style={styles.titleContent}>
            <Text
              style={[
                styles.taskTitle,
                task.completed && styles.taskTitleDone,
              ]}
            >
              {task.title}
            </Text>

            {/* Status chip */}
            <View
              style={[
                styles.statusChip,
                task.completed
                  ? styles.statusChipDone
                  : isOverdue
                  ? styles.statusChipOverdue
                  : styles.statusChipPending,
              ]}
            >
              <Ionicons
                name={
                  task.completed
                    ? 'checkmark-circle'
                    : isOverdue
                    ? 'alert-circle'
                    : 'time-outline'
                }
                size={12}
                color={
                  task.completed
                    ? colors.success
                    : isOverdue
                    ? colors.error
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.statusChipText,
                  task.completed
                    ? { color: colors.success }
                    : isOverdue
                    ? { color: colors.error }
                    : { color: colors.textSecondary },
                ]}
              >
                {task.completed
                  ? 'Completed'
                  : isOverdue
                  ? 'Overdue'
                  : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Metadata card ── */}
        <View style={[styles.card, styles.metaCard]}>
          {/* Priority */}
          <MetaRow icon="flag-outline" label="Priority">
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityBgColor(task.priority) },
              ]}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: priorityColor(task.priority) },
                ]}
              />
              <Text
                style={[
                  styles.priorityBadgeText,
                  { color: priorityColor(task.priority) },
                ]}
              >
                {priorityLabel(task.priority)}
              </Text>
            </View>
          </MetaRow>

          <View style={styles.divider} />

          {/* Due date */}
          <MetaRow icon="calendar-outline" label="Due Date">
            {dueDateLabel ? (
              <Text
                style={[
                  styles.metaValueText,
                  isOverdue && { color: colors.error },
                ]}
              >
                {dueDateLabel}
                {task.dueTime ? `  ·  ${formatTimeDisplay(task.dueTime)}` : ''}
              </Text>
            ) : (
              <Text style={styles.metaValueMuted}>Not set</Text>
            )}
          </MetaRow>

          {/* Category */}
          {category && (
            <>
              <View style={styles.divider} />
              <MetaRow icon="folder-outline" label="Category">
                <View
                  style={[
                    styles.categoryChip,
                    { backgroundColor: category.color + '22', borderColor: category.color },
                  ]}
                >
                  <View
                    style={[styles.categoryDot, { backgroundColor: category.color }]}
                  />
                  <Text
                    style={[styles.categoryChipText, { color: category.color }]}
                  >
                    {category.name}
                  </Text>
                </View>
              </MetaRow>
            </>
          )}

          {/* Sub-task progress */}
          {totalSubCount > 0 && (
            <>
              <View style={styles.divider} />
              <MetaRow icon="list-outline" label="Sub-tasks">
                <Text style={styles.metaValueText}>
                  {completedSubCount} / {totalSubCount} done
                </Text>
              </MetaRow>
            </>
          )}

          {/* Recurrence */}
          {recurrenceLabel && (
            <>
              <View style={styles.divider} />
              <MetaRow icon="repeat-outline" label="Recurrence">
                <Text style={styles.metaValueText}>{recurrenceLabel}</Text>
              </MetaRow>
            </>
          )}
        </View>

        {/* ── Description ── */}
        {task.description ? (
          <View style={[styles.card, styles.descCard]}>
            <Text style={styles.cardSectionTitle}>Description</Text>
            <Text style={styles.descText}>{task.description}</Text>
          </View>
        ) : null}

        {/* ── Sub-tasks ── */}
        {totalSubCount > 0 && (
          <View style={[styles.card, styles.subTasksCard]}>
            <View style={styles.subTasksHeader}>
              <Text style={styles.cardSectionTitle}>Sub-tasks</Text>
              <Text style={styles.subTasksCount}>
                {completedSubCount}/{totalSubCount}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${
                      totalSubCount > 0
                        ? Math.round((completedSubCount / totalSubCount) * 100)
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>

            <View style={styles.subTaskList}>
              {task.subTasks.map((st, idx) => (
                <React.Fragment key={st.id}>
                  {idx > 0 && <View style={styles.subTaskDivider} />}
                  <SubTaskRow subTask={st} onToggle={handleSubTaskToggle} />
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* ── Completion timestamp ── */}
        {task.completed && task.completedAt && (
          <View style={styles.completedStamp}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.completedStampText}>
              Completed {formatDate(task.completedAt, 'MMM d, yyyy · h:mm a')}
            </Text>
          </View>
        )}

        {/* ── Primary action: Mark Complete / Mark Incomplete ── */}
        <TouchableOpacity
          style={[
            styles.primaryAction,
            task.completed ? styles.primaryActionUndo : styles.primaryActionComplete,
            actionLoading === 'complete' && styles.actionDisabled,
          ]}
          onPress={handleToggleComplete}
          disabled={actionLoading !== null}
          activeOpacity={0.85}
        >
          <Ionicons
            name={task.completed ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
            size={20}
            color={task.completed ? colors.textSecondary : colors.white}
          />
          <Text
            style={[
              styles.primaryActionText,
              task.completed
                ? { color: colors.textSecondary }
                : { color: colors.white },
            ]}
          >
            {actionLoading === 'complete'
              ? 'Updating…'
              : task.completed
              ? 'Mark Incomplete'
              : 'Mark Complete'}
          </Text>
        </TouchableOpacity>

        {/* ── Secondary actions: Edit + Delete ── */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            disabled={actionLoading !== null}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit Task</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteBtn,
              actionLoading === 'delete' && styles.actionDisabled,
            ]}
            onPress={handleDelete}
            disabled={actionLoading !== null}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteBtnText}>
              {actionLoading === 'delete' ? 'Deleting…' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const navStyles = StyleSheet.create({
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Card base
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },

  // Title card
  titleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  completionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  completionCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  titleContent: {
    flex: 1,
    gap: spacing.sm,
  },
  taskTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.xxl * typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusChipPending: {
    backgroundColor: colors.surface,
  },
  statusChipDone: {
    backgroundColor: colors.successLight,
  },
  statusChipOverdue: {
    backgroundColor: colors.errorLight,
  },
  statusChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Meta card
  metaCard: {
    gap: 0,
    paddingVertical: spacing.sm,
  },
  metaValueText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },
  metaValueMuted: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },

  // Priority badge
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Category chip
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Description card
  descCard: {},
  cardSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  descText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },

  // Sub-tasks card
  subTasksCard: {},
  subTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subTasksCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textSecondary,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  subTaskList: {
    gap: 0,
  },
  subTaskDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },

  // Completed timestamp
  completedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  completedStampText: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },

  // Primary action
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.medium,
  },
  primaryActionComplete: {
    backgroundColor: colors.primary,
  },
  primaryActionUndo: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.none,
  },
  primaryActionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  actionDisabled: {
    opacity: 0.55,
  },

  // Secondary actions
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryShades[50],
  },
  editBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  deleteBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
});
