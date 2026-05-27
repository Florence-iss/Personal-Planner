/**
 * TasksScreen — the main task list view.
 *
 * Features:
 *  - Realtime subscription to tasks + categories via Firestore
 *  - Filter bar: All | Today | Upcoming | Completed | <category chips>
 *  - Sort: Due Date | Priority | Created Date (modal dropdown)
 *  - FlatList of TaskItem with swipe-to-delete and tap-to-open-detail
 *  - Pull-to-refresh
 *  - EmptyState when no tasks match the active filter
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Task, Category } from '../../types';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import {
  subscribeToTasks,
  subscribeToCategories,
  deleteTask,
  completeTask,
} from '../../services/tasksService';
import { isToday, toLocalDateString } from '../../utils/dateUtils';
import TaskItem from '../../components/tasks/TaskItem';
import EmptyState from '../../components/common/EmptyState';
import { TasksStackParamList } from '../../navigation/stacks/TasksStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Nav = StackNavigationProp<TasksStackParamList, 'Tasks'>;

type FilterId = 'All' | 'Today' | 'Upcoming' | 'Completed' | string; // string = categoryId

type SortKey = 'dueDate' | 'priority' | 'createdAt';

interface SortOption {
  key: SortKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATIC_FILTERS: { id: FilterId; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Today', label: 'Today' },
  { id: 'Upcoming', label: 'Upcoming' },
  { id: 'Completed', label: 'Completed' },
];

const SORT_OPTIONS: SortOption[] = [
  { key: 'dueDate', label: 'Due Date', icon: 'calendar-outline' },
  { key: 'priority', label: 'Priority', icon: 'flag-outline' },
  { key: 'createdAt', label: 'Created Date', icon: 'time-outline' },
];

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUpcoming(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due > today;
}

function applyFilter(
  tasks: Task[],
  filterId: FilterId,
  todayStr: string,
): Task[] {
  switch (filterId) {
    case 'All':
      return tasks.filter((t) => !t.completed);
    case 'Today':
      return tasks.filter((t) => !t.completed && t.dueDate === todayStr);
    case 'Upcoming':
      return tasks.filter(
        (t) => !t.completed && !!t.dueDate && isUpcoming(t.dueDate),
      );
    case 'Completed':
      return tasks.filter((t) => t.completed);
    default:
      // category id
      return tasks.filter(
        (t) => !t.completed && t.categoryId === filterId,
      );
  }
}

function applySort(tasks: Task[], sortKey: SortKey): Task[] {
  const copy = [...tasks];
  switch (sortKey) {
    case 'dueDate':
      return copy.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    case 'priority':
      return copy.sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      );
    case 'createdAt':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

// ---------------------------------------------------------------------------
// SortModal
// ---------------------------------------------------------------------------

interface SortModalProps {
  visible: boolean;
  current: SortKey;
  onSelect: (key: SortKey) => void;
  onClose: () => void;
}

function SortModal({ visible, current, onSelect, onClose }: SortModalProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, backdropOpacity]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sortStyles.backdrop} onPress={onClose}>
        <Animated.View style={[sortStyles.backdropFill, { opacity: backdropOpacity }]} />
      </Pressable>
      <View style={sortStyles.sheet}>
        <View style={sortStyles.handle} />
        <Text style={sortStyles.title}>Sort tasks by</Text>
        {SORT_OPTIONS.map((opt) => {
          const active = opt.key === current;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[sortStyles.row, active && sortStyles.rowActive]}
              onPress={() => { onSelect(opt.key); onClose(); }}
              activeOpacity={0.75}
            >
              <View style={[sortStyles.iconWrap, active && sortStyles.iconWrapActive]}>
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={active ? colors.white : colors.textSecondary}
                />
              </View>
              <Text style={[sortStyles.rowLabel, active && sortStyles.rowLabelActive]}>
                {opt.label}
              </Text>
              {active && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
        <View style={sortStyles.spacer} />
      </View>
    </Modal>
  );
}

const sortStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadows.large,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  rowActive: {},
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  rowLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  spacer: {
    height: Platform.OS === 'ios' ? 32 : spacing.lg,
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TasksScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  // Store
  const { tasks, categories, setTasks, setCategories, removeTask, updateTask } =
    useTasksStore();
  const user = useAuthStore((s) => s.user);

  // Local UI state
  const [activeFilter, setActiveFilter] = useState<FilterId>('All');
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = useMemo(() => toLocalDateString(new Date()), []);

  // ── Firestore subscriptions ───────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return;

    const unsubTasks = subscribeToTasks(user.uid, (updated) => {
      setTasks(updated);
    });
    const unsubCategories = subscribeToCategories(user.uid, (updated) => {
      setCategories(updated);
    });

    return () => {
      unsubTasks();
      unsubCategories();
    };
  }, [user?.uid, setTasks, setCategories]);

  // ── Pull-to-refresh (re-triggers via Firestore snapshot — just visual) ────

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Firestore listener already pushes updates; just reset the spinner briefly
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ── Filtered + sorted task list ───────────────────────────────────────────

  const displayedTasks = useMemo(() => {
    const filtered = applyFilter(tasks, activeFilter, todayStr);
    return applySort(filtered, sortKey);
  }, [tasks, activeFilter, sortKey, todayStr]);

  // ── Pending task count (for subtitle) ────────────────────────────────────

  const pendingCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggleComplete = useCallback(
    async (task: Task) => {
      if (!user?.uid) return;
      try {
        if (task.completed) {
          // Mark incomplete
          await import('../../services/tasksService').then(({ updateTask: svcUpdate }) =>
            svcUpdate(task.id, { ...task, completed: false, completedAt: undefined }),
          );
          updateTask(task.id, { completed: false, completedAt: undefined });
        } else {
          await completeTask(task);
          updateTask(task.id, { completed: true, completedAt: new Date().toISOString() });
        }
      } catch {
        Alert.alert('Error', 'Could not update task. Please try again.');
      }
    },
    [user?.uid, updateTask],
  );

  const handleTaskPress = useCallback(
    (task: Task) => {
      navigation.navigate('TaskDetail', { taskId: task.id });
    },
    [navigation],
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      Alert.alert(
        'Delete Task',
        'Are you sure you want to delete this task? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (!user?.uid) return;
              try {
                removeTask(taskId);
                await deleteTask(taskId, user.uid);
              } catch {
                Alert.alert('Error', 'Could not delete the task.');
              }
            },
          },
        ],
      );
    },
    [user?.uid, removeTask],
  );

  // ── Filter chips (static + category) ─────────────────────────────────────

  const filterChips = useMemo(
    () => [
      ...STATIC_FILTERS,
      ...categories.map((c: Category) => ({ id: c.id, label: c.name, color: c.color })),
    ],
    [categories],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const renderTask = useCallback(
    ({ item }: { item: Task }) => (
      <TaskItem
        task={item}
        categories={categories}
        onToggleComplete={handleToggleComplete}
        onPress={handleTaskPress}
        onDelete={handleDeleteTask}
      />
    ),
    [categories, handleToggleComplete, handleTaskPress, handleDeleteTask],
  );

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'Sort';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSubtitle}>
            {pendingCount === 0
              ? 'All caught up!'
              : `${pendingCount} task${pendingCount !== 1 ? 's' : ''} remaining`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="funnel-outline" size={16} color={colors.primary} />
            <Text style={styles.sortButtonLabel}>{sortLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateTask', {})}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        style={styles.filterBar}
      >
        {filterChips.map((chip) => {
          const isActive = activeFilter === chip.id;
          const categoryColor = (chip as { color?: string }).color;
          return (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.chip,
                isActive && styles.chipActive,
                isActive && categoryColor
                  ? { backgroundColor: categoryColor, borderColor: categoryColor }
                  : undefined,
              ]}
              onPress={() => setActiveFilter(chip.id)}
              activeOpacity={0.75}
            >
              {categoryColor && !isActive && (
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              )}
              <Text
                style={[styles.chipLabel, isActive && styles.chipLabelActive]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Task list ── */}
      <FlatList
        data={displayedTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={[
          styles.listContent,
          displayedTasks.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            title={
              activeFilter === 'Completed'
                ? 'No completed tasks'
                : activeFilter === 'Today'
                ? 'Nothing due today'
                : activeFilter === 'Upcoming'
                ? 'No upcoming tasks'
                : 'No tasks yet'
            }
            subtitle={
              activeFilter === 'Completed'
                ? 'Tasks you complete will appear here.'
                : 'Tap the + button to create your first task.'
            }
            actionLabel={activeFilter !== 'Completed' ? 'New Task' : undefined}
            onAction={
              activeFilter !== 'Completed'
                ? () => navigation.navigate('CreateTask', {})
                : undefined
            }
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* ── Sort modal ── */}
      <SortModal
        visible={sortModalVisible}
        current={sortKey}
        onSelect={setSortKey}
        onClose={() => setSortModalVisible(false)}
      />
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryShades[50],
  },
  sortButtonLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  // Filter bar
  filterBar: {
    flexGrow: 0,
    marginBottom: spacing.xs,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.white,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 0,
  },
});
