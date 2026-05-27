/**
 * HabitsScreen — main habits list with today's progress, completion toggle,
 * and navigation to CreateHabit / HabitDetail.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { HabitsStackParamList } from '../../navigation/stacks/HabitsStack';
import { Habit } from '../../types';
import {
  useHabitsStore,
  selectActiveHabits,
  selectTodayCompletedHabitIds,
  selectStreakForHabit,
} from '../../store/habitsStore';
import { useAuthStore, selectUserId } from '../../store/authStore';
import {
  subscribeToHabits,
  subscribeToHabitLogs,
  logHabit,
  unlogHabit,
} from '../../services/habitsService';
import { getCurrentMonth } from '../../utils/dateUtils';
import HabitCard from '../../components/habits/HabitCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HabitsNavProp = StackNavigationProp<HabitsStackParamList, 'Habits'>;

interface Props {
  navigation: HabitsNavProp;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodaySubtitle(): string {
  return format(new Date(), 'MMMM d, yyyy');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HabitsScreen({ navigation }: Props): React.JSX.Element {
  const userId = useAuthStore(selectUserId);

  const habits = useHabitsStore(selectActiveHabits);
  const loading = useHabitsStore((s) => s.loading);
  const setLoading = useHabitsStore((s) => s.setLoading);
  const setHabits = useHabitsStore((s) => s.setHabits);
  const setHabitLogs = useHabitsStore((s) => s.setHabitLogs);
  const addHabitLog = useHabitsStore((s) => s.addHabitLog);
  const removeHabitLog = useHabitsStore((s) => s.removeHabitLog);
  const habitLogs = useHabitsStore((s) => s.habitLogs);

  const completedToday = useHabitsStore(selectTodayCompletedHabitIds);

  // Track in-flight toggle ops to prevent double-taps
  const pendingToggles = useRef<Set<string>>(new Set());

  // ── Subscriptions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    const unsubHabits = subscribeToHabits(userId, (fetched) => {
      setHabits(fetched);
      setLoading(false);
    });

    const currentMonth = getCurrentMonth();
    const unsubLogs = subscribeToHabitLogs(userId, currentMonth, (logs) => {
      setHabitLogs(logs);
    });

    return () => {
      unsubHabits();
      unsubLogs();
    };
  }, [userId, setHabits, setHabitLogs, setLoading]);

  // ── Toggle completion ──────────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (habitId: string) => {
      if (!userId || pendingToggles.current.has(habitId)) return;
      pendingToggles.current.add(habitId);

      const todayStr = format(new Date(), 'yyyy-MM-dd');

      try {
        if (completedToday.has(habitId)) {
          // Find the log entry for today
          const log = habitLogs.find(
            (l) => l.habitId === habitId && l.date === todayStr,
          );
          if (log) {
            removeHabitLog(log.id);
            await unlogHabit(log.id, userId);
          }
        } else {
          const newLog = await logHabit(userId, habitId, todayStr);
          addHabitLog(newLog);
        }
      } catch (err) {
        console.error('Toggle habit error:', err);
      } finally {
        pendingToggles.current.delete(habitId);
      }
    },
    [userId, completedToday, habitLogs, addHabitLog, removeHabitLog],
  );

  // ── Navigate to detail ─────────────────────────────────────────────────────

  const handlePressHabit = useCallback(
    (habit: Habit) => {
      navigation.navigate('HabitDetail', { habitId: habit.id });
    },
    [navigation],
  );

  // ── Progress ───────────────────────────────────────────────────────────────

  const { completedCount, totalCount, progressRatio } = useMemo(() => {
    const total = habits.length;
    const completed = habits.filter((h) => completedToday.has(h.id)).length;
    return {
      completedCount: completed,
      totalCount: total,
      progressRatio: total > 0 ? completed / total : 0,
    };
  }, [habits, completedToday]);

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Habit>) => {
      const streak = selectStreakForHabit(item.id)(useHabitsStore.getState());
      return (
        <HabitCard
          habit={item}
          isCompletedToday={completedToday.has(item.id)}
          currentStreak={streak}
          onToggle={handleToggle}
          onPress={handlePressHabit}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedToday, handleToggle, handlePressHabit],
  );

  const keyExtractor = useCallback((item: Habit) => item.id, []);

  // ── Empty state ────────────────────────────────────────────────────────────

  const ListEmpty = useMemo(
    () => (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="repeat-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No habits yet</Text>
        <Text style={styles.emptySubtitle}>
          Start building better habits!
        </Text>
        <TouchableOpacity
          style={styles.emptyAction}
          onPress={() => navigation.navigate('CreateHabit')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.emptyActionText}>New Habit</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation],
  );

  // ── Header component ───────────────────────────────────────────────────────

  const ListHeader = useMemo(
    () => (
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {completedCount} of {totalCount} habits completed
          </Text>
          <Text style={styles.progressPercent}>
            {totalCount > 0 ? `${Math.round(progressRatio * 100)}%` : '—'}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progressRatio * 100)}%` },
            ]}
          />
        </View>
      </View>
    ),
    [completedCount, totalCount, progressRatio],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ── App header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Habits</Text>
          <Text style={styles.headerSubtitle}>{getTodaySubtitle()}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateHabit')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      {loading && habits.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={habits.length > 0 ? ListHeader : null}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
        />
      )}
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

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  // ── Progress bar ──────────────────────────────────────────────────────────
  progressSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  progressPercent: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryShades[100],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyCard: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryShades[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    marginBottom: spacing.lg,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryShades[50],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },

  // ── Loader ────────────────────────────────────────────────────────────────
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
