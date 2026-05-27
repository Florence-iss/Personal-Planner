/**
 * DashboardScreen — the Today / Home tab.
 *
 * Sections:
 *   1. Header  — greeting + date
 *   2. Today's Schedule — up to 4 events with "See all" link
 *   3. Today's Focus    — tasks due today, sorted high → low priority
 *   4. Habits Today     — habits with inline toggle
 *   5. FAB              — "+" → action sheet
 *
 * Data: real-time Firestore subscriptions via services, stored in Zustand.
 * Unsubscribes on unmount.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

import { useAuthStore } from '../../store/authStore';
import { useTasksStore } from '../../store/tasksStore';
import { useEventsStore } from '../../store/eventsStore';
import {
  useHabitsStore,
  selectActiveHabits,
  selectTodayCompletedHabitIds,
  selectStreakForHabit,
} from '../../store/habitsStore';

import {
  subscribeToTasks,
  subscribeToCategories,
  completeTask,
} from '../../services/tasksService';
import { subscribeToEvents } from '../../services/eventsService';
import {
  subscribeToHabits,
  subscribeToHabitLogs,
  logHabit,
  unlogHabit,
} from '../../services/habitsService';

import { formatDate, formatTime, toLocalDateString } from '../../utils/dateUtils';
import { isHabitDueOnDate } from '../../utils/recurrenceUtils';

import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';

import type { MainTabParamList } from '../../navigation/MainNavigator';
import type { Task, CalendarEvent, Habit } from '../../types';

// ---------------------------------------------------------------------------
// Navigation type — tab navigator
// ---------------------------------------------------------------------------

type DashboardNavProp = BottomTabNavigationProp<MainTabParamList>;

// ---------------------------------------------------------------------------
// Priority sort order
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ---------------------------------------------------------------------------
// Sub-component: SectionHeader
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel !== undefined && onAction !== undefined && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: EventRow
// ---------------------------------------------------------------------------

interface EventRowProps {
  event: CalendarEvent;
  isLast: boolean;
}

function EventRow({ event, isLast }: EventRowProps): React.JSX.Element {
  return (
    <View style={[styles.eventRow, !isLast && styles.eventRowBorder]}>
      <View style={[styles.eventDot, { backgroundColor: event.color }]} />
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.eventTime}>
          {event.allDay
            ? 'All day'
            : `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: DashboardTaskRow (simplified — no swipe)
// ---------------------------------------------------------------------------

interface DashboardTaskRowProps {
  task: Task;
  onToggle: (task: Task) => void;
}

function DashboardTaskRow({
  task,
  onToggle,
}: DashboardTaskRowProps): React.JSX.Element {
  const priorityColor =
    task.priority === 'high'
      ? colors.priorityHigh
      : task.priority === 'medium'
      ? colors.priorityMedium
      : colors.priorityLow;

  return (
    <View style={styles.taskRow}>
      {/* Priority accent */}
      <View style={[styles.taskPriorityDot, { backgroundColor: priorityColor }]} />

      {/* Checkbox */}
      <TouchableOpacity
        onPress={() => onToggle(task)}
        style={styles.taskCheckboxHit}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <View style={[styles.taskCheckbox, task.completed && styles.taskCheckboxDone]}>
          {task.completed && (
            <Ionicons name="checkmark" size={11} color={colors.white} />
          )}
        </View>
      </TouchableOpacity>

      {/* Title */}
      <Text
        style={[styles.taskTitle, task.completed && styles.taskTitleDone]}
        numberOfLines={2}
      >
        {task.title}
      </Text>

      {/* Due time if set */}
      {task.dueTime ? (
        <Text style={styles.taskTime}>{task.dueTime}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: HabitRow (dashboard inline version)
// ---------------------------------------------------------------------------

interface HabitRowProps {
  habit: Habit;
  isCompleted: boolean;
  streak: number;
  onToggle: (habitId: string) => void;
  isLast: boolean;
}

function HabitRow({
  habit,
  isCompleted,
  streak,
  onToggle,
  isLast,
}: HabitRowProps): React.JSX.Element {
  return (
    <View style={[styles.habitRow, !isLast && styles.habitRowBorder]}>
      {/* Icon */}
      <View
        style={[styles.habitIconBg, { backgroundColor: habit.color + '22' }]}
      >
        <Ionicons
          name={habit.icon as React.ComponentProps<typeof Ionicons>['name']}
          size={18}
          color={habit.color}
        />
      </View>

      {/* Name */}
      <Text style={styles.habitName} numberOfLines={1}>
        {habit.name}
      </Text>

      {/* Streak badge */}
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streak}</Text>
        </View>
      )}

      {/* Toggle */}
      <TouchableOpacity
        onPress={() => onToggle(habit.id)}
        style={styles.habitToggleHit}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View
          style={[
            styles.habitToggle,
            isCompleted && {
              backgroundColor: habit.color,
              borderColor: habit.color,
            },
          ]}
        >
          {isCompleted && (
            <Ionicons name="checkmark" size={12} color={colors.white} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function DashboardScreen(): React.JSX.Element {
  const navigation = useNavigation<DashboardNavProp>();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user);
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const uid = user?.uid ?? '';

  // ── Stores ────────────────────────────────────────────────────────────────
  const tasks = useTasksStore((s) => s.tasks);
  const categories = useTasksStore((s) => s.categories);
  const setTasks = useTasksStore((s) => s.setTasks);
  const setCategories = useTasksStore((s) => s.setCategories);
  const updateTask = useTasksStore((s) => s.updateTask);

  const events = useEventsStore((s) => s.events);
  const setEvents = useEventsStore((s) => s.setEvents);

  const habits = useHabitsStore(selectActiveHabits);
  const habitLogs = useHabitsStore((s) => s.habitLogs);
  const setHabits = useHabitsStore((s) => s.setHabits);
  const setHabitLogs = useHabitsStore((s) => s.setHabitLogs);
  const addHabitLog = useHabitsStore((s) => s.addHabitLog);
  const removeHabitLog = useHabitsStore((s) => s.removeHabitLog);
  const todayCompletedIds = useHabitsStore(selectTodayCompletedHabitIds);

  // ── Loading state ─────────────────────────────────────────────────────────
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [habitsLoaded, setHabitsLoaded] = useState(false);

  const isLoading = !tasksLoaded || !eventsLoaded || !habitsLoaded;

  // ── FAB animation ─────────────────────────────────────────────────────────
  const fabScale = useRef(new Animated.Value(1)).current;

  // ── Subscriptions ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return;

    const todayMonth = toLocalDateString(new Date()).slice(0, 7); // 'YYYY-MM'

    const unsubTasks = subscribeToTasks(uid, (updated) => {
      setTasks(updated);
      setTasksLoaded(true);
    });

    const unsubCategories = subscribeToCategories(uid, (updated) => {
      setCategories(updated);
    });

    const unsubEvents = subscribeToEvents(uid, (updated) => {
      setEvents(updated);
      setEventsLoaded(true);
    });

    const unsubHabits = subscribeToHabits(uid, (updated) => {
      setHabits(updated);
      setHabitsLoaded(true);
    });

    const unsubLogs = subscribeToHabitLogs(uid, todayMonth, (updated) => {
      setHabitLogs(updated);
    });

    return () => {
      unsubTasks();
      unsubCategories();
      unsubEvents();
      unsubHabits();
      unsubLogs();
    };
  }, [uid, setTasks, setCategories, setEvents, setHabits, setHabitLogs]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const todayString = useMemo(() => toLocalDateString(new Date()), []);

  /** Events that start today, sorted ascending by startTime, capped at 4 */
  const todayEvents = useMemo<CalendarEvent[]>(() => {
    return events
      .filter((e) => e.startTime.startsWith(todayString))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 4);
  }, [events, todayString]);

  /** Tasks due today, sorted high → low priority, incomplete first */
  const todayTasks = useMemo<Task[]>(() => {
    return tasks
      .filter((t) => t.dueDate === todayString)
      .sort((a, b) => {
        // Incomplete before complete
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      });
  }, [tasks, todayString]);

  /** Active habits due today */
  const todayHabits = useMemo<Habit[]>(() => {
    const today = new Date();
    return habits.filter((h) =>
      isHabitDueOnDate(h.targetDays, today),
    );
  }, [habits]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleTask = useCallback(
    async (task: Task) => {
      // Optimistic update
      updateTask(task.id, {
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : undefined,
      });
      try {
        if (!task.completed) {
          await completeTask(task);
        } else {
          // Re-opening: just update the flag
          await import('../../services/tasksService').then((svc) =>
            svc.updateTask(task.id, {
              userId: task.userId,
              completed: false,
              completedAt: undefined,
            }),
          );
        }
      } catch (err) {
        // Revert
        updateTask(task.id, {
          completed: task.completed,
          completedAt: task.completedAt,
        });
        Alert.alert('Error', 'Failed to update task. Please try again.');
      }
    },
    [updateTask],
  );

  const handleToggleHabit = useCallback(
    async (habitId: string) => {
      if (!uid) return;

      const isCompleted = todayCompletedIds.has(habitId);

      if (isCompleted) {
        // Find the log to remove
        const log = habitLogs.find(
          (l) =>
            l.habitId === habitId && l.date === todayString && l.userId === uid,
        );
        if (!log) return;

        // Optimistic
        removeHabitLog(log.id);
        try {
          await unlogHabit(log.id, uid);
        } catch {
          addHabitLog(log);
          Alert.alert('Error', 'Failed to update habit. Please try again.');
        }
      } else {
        // Optimistic — create a temporary local entry
        const tempLog = {
          id: `temp_${habitId}_${Date.now()}`,
          habitId,
          userId: uid,
          date: todayString,
          completedAt: new Date().toISOString(),
        };
        addHabitLog(tempLog);
        try {
          const saved = await logHabit(uid, habitId, todayString);
          // Replace temp with the real one
          removeHabitLog(tempLog.id);
          addHabitLog(saved);
        } catch {
          removeHabitLog(tempLog.id);
          Alert.alert('Error', 'Failed to log habit. Please try again.');
        }
      }
    },
    [uid, todayString, todayCompletedIds, habitLogs, addHabitLog, removeHabitLog],
  );

  // ── FAB action sheet ──────────────────────────────────────────────────────

  const animateFab = useCallback(() => {
    Animated.sequence([
      Animated.timing(fabScale, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fabScale]);

  const showActionSheet = useCallback(() => {
    animateFab();

    const options = ['Add Task', 'Add Event', 'Log Expense', 'Log Income', 'Cancel'];
    const cancelIndex = 4;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (index) => handleActionSheetChoice(index),
      );
    } else {
      Alert.alert('Create New', undefined, [
        { text: 'Add Task', onPress: () => handleActionSheetChoice(0) },
        { text: 'Add Event', onPress: () => handleActionSheetChoice(1) },
        { text: 'Log Expense', onPress: () => handleActionSheetChoice(2) },
        { text: 'Log Income', onPress: () => handleActionSheetChoice(3) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [animateFab]);

  const handleActionSheetChoice = useCallback(
    (index: number) => {
      switch (index) {
        case 0:
          // Navigate to TaskCreate modal — rooted in RootStack
          navigation.navigate('TasksTab' as any);
          break;
        case 1:
          navigation.navigate('ScheduleTab' as any);
          break;
        case 2:
          navigation.navigate('FinanceTab' as any);
          break;
        case 3:
          navigation.navigate('FinanceTab' as any);
          break;
      }
    },
    [navigation],
  );

  // ── Streak helper for individual habit ───────────────────────────────────

  const getStreak = useCallback(
    (habitId: string): number => {
      return selectStreakForHabit(habitId)({ habits, habitLogs, loading: false });
    },
    [habits, habitLogs],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <LoadingSpinner fullScreen message="Loading your day…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Header ── */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName}! 👋
            </Text>
            <Text style={styles.dateLabel}>
              {formatDate(new Date(), 'EEEE, MMMM d')}
            </Text>
          </View>

          {/* Avatar initials */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName ?? user?.email ?? '?')[0].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── 2. Today's Schedule ── */}
        <SectionHeader
          title="Today's Schedule"
          actionLabel="See all"
          onAction={() => navigation.navigate('ScheduleTab' as any)}
        />
        <Card style={styles.sectionCard}>
          {todayEvents.length === 0 ? (
            <View style={styles.emptyInCard}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={colors.border}
              />
              <Text style={styles.emptyInCardText}>No events today</Text>
            </View>
          ) : (
            todayEvents.map((event, index) => (
              <EventRow
                key={event.id}
                event={event}
                isLast={index === todayEvents.length - 1}
              />
            ))
          )}
        </Card>

        {/* ── 3. Today's Focus (tasks) ── */}
        <SectionHeader
          title="Today's Focus"
          actionLabel="Add task"
          onAction={() => navigation.navigate('TasksTab' as any)}
        />
        <Card style={styles.sectionCard}>
          {todayTasks.length === 0 ? (
            <View style={styles.emptyInCard}>
              <Ionicons
                name="checkmark-circle-outline"
                size={28}
                color={colors.border}
              />
              <Text style={styles.emptyInCardText}>No tasks due today</Text>
            </View>
          ) : (
            todayTasks.map((task) => (
              <DashboardTaskRow
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
              />
            ))
          )}
        </Card>

        {/* ── 4. Habits Today ── */}
        <SectionHeader
          title="Habits"
          actionLabel="See all"
          onAction={() => navigation.navigate('HabitsTab' as any)}
        />
        <Card style={styles.sectionCard}>
          {todayHabits.length === 0 ? (
            <View style={styles.emptyInCard}>
              <Ionicons name="repeat-outline" size={28} color={colors.border} />
              <Text style={styles.emptyInCardText}>No habits scheduled today</Text>
            </View>
          ) : (
            todayHabits.map((habit, index) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                isCompleted={todayCompletedIds.has(habit.id)}
                streak={getStreak(habit.id)}
                onToggle={handleToggleHabit}
                isLast={index === todayHabits.length - 1}
              />
            ))
          )}
        </Card>

        {/* Bottom padding for FAB clearance */}
        <View style={{ height: spacing.xxl + spacing.xl }} />
      </ScrollView>

      {/* ── 5. Floating Action Button ── */}
      <Animated.View
        style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={showActionSheet}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  greeting: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  sectionAction: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },

  // ── Section card wrapper ──────────────────────────────────────────────────
  sectionCard: {
    marginBottom: spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },

  // ── Empty in-card state ───────────────────────────────────────────────────
  emptyInCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyInCardText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },

  // ── Event row ─────────────────────────────────────────────────────────────
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 52,
  },
  eventRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.regular,
  },

  // ── Task row ──────────────────────────────────────────────────────────────
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  taskPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  taskCheckboxHit: {
    marginRight: spacing.sm,
    padding: 2,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taskTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  taskTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
    flexShrink: 0,
  },

  // ── Habit row ─────────────────────────────────────────────────────────────
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 56,
  },
  habitRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  habitIconBg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  habitName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  streakBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  streakText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.warningDark,
  },
  habitToggleHit: {
    padding: spacing.xs,
  },
  habitToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
  },
});
