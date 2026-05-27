/**
 * HabitDetailScreen — full analytics view for a single habit.
 *
 * Sections:
 *  - Header: icon, name, description + Edit / Archive actions
 *  - Stats: current streak, best streak, 30-day completion rate (circular)
 *  - Monthly heatmap (7-col grid, prev/next month navigation)
 *  - 8-week bar chart (pure View-based, no third-party chart library)
 *  - Quick log / undo button
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths, startOfMonth, getDaysInMonth, getDay } from 'date-fns';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { HabitsStackParamList } from '../../navigation/stacks/HabitsStack';
import { Habit, HabitLog } from '../../types';
import {
  useHabitsStore,
  selectHabitById,
} from '../../store/habitsStore';
import { useAuthStore, selectUserId } from '../../store/authStore';
import {
  subscribeToHabitLogs,
  logHabit,
  unlogHabit,
  archiveHabit,
  getHabitStreak,
  getCompletionRate,
} from '../../services/habitsService';
import { toLocalDateString } from '../../utils/dateUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HabitDetailNavProp = StackNavigationProp<HabitsStackParamList, 'HabitDetail'>;
type HabitDetailRouteProp = RouteProp<HabitsStackParamList, 'HabitDetail'>;

interface Props {
  navigation: HabitDetailNavProp;
  route: HabitDetailRouteProp;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width;
// 7-column heatmap cell size (fits within padding)
const CELL_SIZE = Math.floor((SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2 - 6 * 4) / 7);
const WEEK_HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Circular progress indicator (SVG-free, using border trick)
// ---------------------------------------------------------------------------

interface CircularProgressProps {
  percentage: number;  // 0-100
  color: string;
  size?: number;
}

function CircularProgress({
  percentage,
  color,
  size = 80,
}: CircularProgressProps): React.JSX.Element {
  const clipped = Math.min(100, Math.max(0, percentage));
  const strokeWidth = size * 0.1;
  const innerSize = size - strokeWidth * 2;

  // Use two layered arcs via border + overflow:hidden (conic-gradient not available
  // in RN; we approximate with the classic "two half-circle" technique via
  // transform:rotate on inner views).
  const fillDeg = (clipped / 100) * 360;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color + '25',
        }}
      />
      {/* Fill — left half (0-180°) */}
      {fillDeg > 0 && (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size / 2,
              height: size,
              left: size / 2,
              top: 0,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: color,
                position: 'absolute',
                left: -size / 2,
                top: 0,
                transform: [{ rotate: `${Math.min(fillDeg, 180)}deg` }],
              }}
            />
          </View>
          {fillDeg > 180 && (
            <View
              style={{
                position: 'absolute',
                width: size / 2,
                height: size,
                left: 0,
                top: 0,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: strokeWidth,
                  borderColor: color,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: [{ rotate: `${fillDeg - 180}deg` }],
                }}
              />
            </View>
          )}
        </View>
      )}
      {/* Centre label */}
      <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color }}>
        {clipped}%
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Monthly heatmap
// ---------------------------------------------------------------------------

interface HeatmapProps {
  year: number;
  month: number;       // 0-indexed
  logDates: Set<string>;
  habitColor: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
}

function MonthHeatmap({
  year,
  month,
  logDates,
  habitColor,
  onPrevMonth,
  onNextMonth,
  canGoNext,
}: HeatmapProps): React.JSX.Element {
  const monthLabel = format(new Date(year, month, 1), 'MMMM yyyy');
  const daysInMonth = getDaysInMonth(new Date(year, month, 1));
  const today = new Date();
  const todayStr = toLocalDateString(today);

  // getDay returns 0=Sun…6=Sat; we want 0=Mon…6=Sun for our header
  // Monday offset: (getDay() + 6) % 7
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = (getDay(firstDayOfMonth) + 6) % 7; // Mon-based

  // Build grid: nulls for padding + day numbers
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null);

  function getCellStyle(dayNum: number | null) {
    if (dayNum === null) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const isFuture = dateStr > todayStr;
    const isLogged = logDates.has(dateStr);
    const isToday = dateStr === todayStr;

    if (isLogged) {
      return { backgroundColor: habitColor };
    }
    if (isFuture) {
      return { backgroundColor: colors.divider, opacity: 0.5 };
    }
    if (isToday) {
      return { backgroundColor: colors.border, borderWidth: 1.5, borderColor: habitColor };
    }
    return { backgroundColor: colors.border };
  }

  function getDayTextColor(dayNum: number | null): string {
    if (dayNum === null) return 'transparent';
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const isLogged = logDates.has(dateStr);
    const isToday = dateStr === todayStr;
    if (isLogged) return colors.white;
    if (isToday) return habitColor;
    return colors.textMuted;
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={hmStyles.container}>
      {/* Month navigation */}
      <View style={hmStyles.navRow}>
        <TouchableOpacity
          style={hmStyles.navButton}
          onPress={onPrevMonth}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={hmStyles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          style={[hmStyles.navButton, !canGoNext && hmStyles.navButtonDisabled]}
          onPress={canGoNext ? onNextMonth : undefined}
          activeOpacity={0.75}
          disabled={!canGoNext}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canGoNext ? colors.textPrimary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={hmStyles.row}>
        {WEEK_HEADER.map((h) => (
          <View key={h} style={hmStyles.headerCell}>
            <Text style={hmStyles.headerText}>{h[0]}</Text>
          </View>
        ))}
      </View>

      {/* Day cells */}
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={hmStyles.row}>
          {row.map((dayNum, colIdx) => {
            const cellStyle = getCellStyle(dayNum);
            const textColor = getDayTextColor(dayNum);
            return (
              <View key={colIdx} style={hmStyles.cellWrapper}>
                <View style={[hmStyles.cell, cellStyle ?? hmStyles.cellEmpty]}>
                  {dayNum !== null && (
                    <Text style={[hmStyles.cellText, { color: textColor }]}>
                      {dayNum}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const hmStyles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  monthLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  headerCell: {
    width: CELL_SIZE,
    height: CELL_SIZE * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  headerText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  cellWrapper: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginHorizontal: 2,
  },
  cell: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: {
    backgroundColor: 'transparent',
  },
  cellText: {
    fontSize: Math.max(9, CELL_SIZE * 0.35),
    fontWeight: typography.fontWeight.medium,
  },
});

// ---------------------------------------------------------------------------
// 8-week bar chart (pure View-based)
// ---------------------------------------------------------------------------

interface WeeklyBarChartProps {
  logs: HabitLog[];
  habit: Habit;
  habitColor: string;
}

interface WeekBar {
  label: string;       // e.g. "Apr 28"
  rate: number;        // 0-100
  completed: number;
  scheduled: number;
}

function WeeklyBarChart({ logs, habit, habitColor }: WeeklyBarChartProps): React.JSX.Element {
  const bars: WeekBar[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const loggedDates = new Set(
      logs.filter((l) => l.habitId === habit.id).map((l) => l.date),
    );

    const weeks: WeekBar[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekEnd = new Date(today.getTime() - w * 7 * 86_400_000);
      const weekStart = new Date(weekEnd.getTime() - 6 * 86_400_000);
      let scheduled = 0;
      let completed = 0;

      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart.getTime() + d * 86_400_000);
        if (day > today) continue;
        const isDue =
          habit.targetDays.length === 0 ||
          habit.targetDays.includes(day.getDay());
        if (!isDue) continue;
        scheduled++;
        const key = toLocalDateString(day);
        if (loggedDates.has(key)) completed++;
      }

      const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
      weeks.push({
        label: format(weekStart, 'MMM d'),
        rate,
        completed,
        scheduled,
      });
    }
    return weeks;
  }, [logs, habit]);

  const maxRate = 100; // bars are always relative to 100%
  const BAR_HEIGHT = 100;

  return (
    <View style={barStyles.container}>
      {bars.map((bar, idx) => {
        const fillH = Math.round((bar.rate / maxRate) * BAR_HEIGHT);
        const isLatest = idx === bars.length - 1;
        return (
          <View key={idx} style={barStyles.barCol}>
            {/* Percentage label */}
            <Text style={[barStyles.percentLabel, { color: isLatest ? habitColor : colors.textMuted }]}>
              {bar.scheduled > 0 ? `${bar.rate}%` : '—'}
            </Text>
            {/* Bar track */}
            <View style={[barStyles.track, { height: BAR_HEIGHT }]}>
              <View
                style={[
                  barStyles.fill,
                  {
                    height: fillH,
                    backgroundColor: isLatest ? habitColor : habitColor + '60',
                  },
                ]}
              />
            </View>
            {/* Week label */}
            <Text style={barStyles.weekLabel} numberOfLines={2}>
              {bar.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingTop: spacing.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  percentLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeight.semiBold,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  weekLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 11,
  },
});

// ---------------------------------------------------------------------------
// Frequency display helper
// ---------------------------------------------------------------------------

function frequencyLabel(habit: Habit): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (habit.frequency) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      if (habit.targetDays.length === 0) return 'Weekly';
      return habit.targetDays
        .slice()
        .sort((a, b) => a - b)
        .map((d) => dayNames[d])
        .join(', ');
    case 'custom':
      return `${habit.targetCount} time${habit.targetCount !== 1 ? 's' : ''} per week`;
    default:
      return 'Daily';
  }
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function HabitDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { habitId } = route.params;
  const userId = useAuthStore(selectUserId);

  // ── Store reads ─────────────────────────────────────────────────────────────
  const habit = useHabitsStore(selectHabitById(habitId));
  const allLogs = useHabitsStore((s) => s.habitLogs);
  const removeHabitFromStore = useHabitsStore((s) => s.removeHabit);
  const addHabitLog = useHabitsStore((s) => s.addHabitLog);
  const removeHabitLog = useHabitsStore((s) => s.removeHabitLog);

  // ── Heatmap month state ────────────────────────────────────────────────────
  const nowDate = new Date();
  const [heatmapDate, setHeatmapDate] = useState<Date>(startOfMonth(nowDate));

  // Local logs for the currently displayed month
  const [monthLogs, setMonthLogs] = useState<HabitLog[]>([]);

  const heatmapYear = heatmapDate.getFullYear();
  const heatmapMonth = heatmapDate.getMonth(); // 0-indexed
  const heatmapMonthStr = format(heatmapDate, 'yyyy-MM');

  // ── Today toggle ───────────────────────────────────────────────────────────
  const todayStr = toLocalDateString(nowDate);
  const pendingToggle = useRef(false);

  const todayLog = useMemo(
    () => allLogs.find((l) => l.habitId === habitId && l.date === todayStr),
    [allLogs, habitId, todayStr],
  );
  const isCompletedToday = Boolean(todayLog);

  // ── Subscribe to logs for displayed month ──────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToHabitLogs(userId, heatmapMonthStr, (logs) => {
      setMonthLogs(logs);
    });
    return () => unsub();
  }, [userId, heatmapMonthStr]);

  // ── Analytics derived from ALL logs (not just current month) ──────────────
  const { currentStreak, bestStreak, completionRate30 } = useMemo(() => {
    if (!habit) return { currentStreak: 0, bestStreak: 0, completionRate30: 0 };
    const streaks = getHabitStreak(habitId, allLogs, habit);
    const rate = getCompletionRate(habitId, allLogs, habit, 30);
    return {
      currentStreak: streaks.current,
      bestStreak: streaks.best,
      completionRate30: rate,
    };
  }, [habit, allLogs, habitId]);

  // ── Heatmap log dates set for the displayed month ─────────────────────────
  const heatmapLogDates = useMemo<Set<string>>(() => {
    const habitMonthLogs = monthLogs.filter((l) => l.habitId === habitId);
    return new Set(habitMonthLogs.map((l) => l.date));
  }, [monthLogs, habitId]);

  // ── Month navigation ───────────────────────────────────────────────────────
  const handlePrevMonth = useCallback(() => {
    setHeatmapDate((d) => startOfMonth(subMonths(d, 1)));
  }, []);

  const handleNextMonth = useCallback(() => {
    setHeatmapDate((d) => startOfMonth(addMonths(d, 1)));
  }, []);

  const canGoNextMonth = useMemo(() => {
    const next = startOfMonth(addMonths(heatmapDate, 1));
    return next <= startOfMonth(nowDate);
  }, [heatmapDate, nowDate]);

  // ── Toggle today ───────────────────────────────────────────────────────────
  const handleToggleToday = useCallback(async () => {
    if (!userId || !habit || pendingToggle.current) return;
    pendingToggle.current = true;

    try {
      if (isCompletedToday && todayLog) {
        removeHabitLog(todayLog.id);
        await unlogHabit(todayLog.id, userId);
      } else {
        const newLog = await logHabit(userId, habitId, todayStr);
        addHabitLog(newLog);
      }
    } catch (err) {
      console.error('Toggle habit today error:', err);
    } finally {
      pendingToggle.current = false;
    }
  }, [
    userId,
    habit,
    isCompletedToday,
    todayLog,
    habitId,
    todayStr,
    addHabitLog,
    removeHabitLog,
  ]);

  // ── Archive ────────────────────────────────────────────────────────────────
  const handleArchive = useCallback(() => {
    if (!userId || !habit) return;
    Alert.alert(
      'Archive Habit',
      `Archive "${habit.name}"? It will no longer appear in your list, but all logs will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveHabit(habitId, userId);
              removeHabitFromStore(habitId);
              navigation.goBack();
            } catch (err) {
              console.error('Archive habit error:', err);
              Alert.alert('Error', 'Could not archive habit. Please try again.');
            }
          },
        },
      ],
    );
  }, [userId, habit, habitId, removeHabitFromStore, navigation]);

  // ── Navigate to edit ───────────────────────────────────────────────────────
  const handleEdit = useCallback(() => {
    // Navigate to CreateHabit in edit mode — extend when an edit route is added
    navigation.navigate('CreateHabit');
  }, [navigation]);

  // ── Loading / not found ────────────────────────────────────────────────────
  if (!habit) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const habitColor = habit.color;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header card ── */}
        <View style={[styles.heroCard, { backgroundColor: habitColor }, shadows.medium]}>
          {/* Top-right actions */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.white} />
              <Text style={styles.heroActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={handleArchive}
              activeOpacity={0.8}
            >
              <Ionicons name="archive-outline" size={18} color={colors.white} />
              <Text style={styles.heroActionText}>Archive</Text>
            </TouchableOpacity>
          </View>

          {/* Icon + title */}
          <View style={styles.heroIconBg}>
            <Ionicons
              name={habit.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={40}
              color={habitColor}
            />
          </View>
          <Text style={styles.heroTitle}>{habit.name}</Text>
          {habit.description ? (
            <Text style={styles.heroDesc}>{habit.description}</Text>
          ) : null}
        </View>

        {/* ── Streak stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, shadows.small]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statValue, { color: habitColor }]}>
              {currentStreak}
            </Text>
            <Text style={styles.statUnit}>days</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={[styles.statCard, shadows.small]}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={[styles.statValue, { color: habitColor }]}>
              {bestStreak}
            </Text>
            <Text style={styles.statUnit}>days</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>

        {/* ── 30-day completion rate ── */}
        <View style={[styles.card, shadows.small, styles.completionCard]}>
          <View style={styles.completionLeft}>
            <Text style={styles.cardTitle}>30-Day Completion</Text>
            <Text style={styles.completionSubtitle}>
              {completionRate30 >= 80
                ? 'Excellent consistency!'
                : completionRate30 >= 60
                ? 'Good progress, keep it up.'
                : completionRate30 >= 40
                ? 'Room to improve.'
                : 'Let\'s build this habit!'}
            </Text>
          </View>
          <CircularProgress
            percentage={completionRate30}
            color={habitColor}
            size={76}
          />
        </View>

        {/* ── Monthly heatmap ── */}
        <View style={[styles.card, shadows.small]}>
          <Text style={styles.cardTitle}>Monthly Overview</Text>
          <MonthHeatmap
            year={heatmapYear}
            month={heatmapMonth}
            logDates={heatmapLogDates}
            habitColor={habitColor}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            canGoNext={canGoNextMonth}
          />
          {/* Heatmap legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.divider, opacity: 0.5 }]} />
              <Text style={styles.legendText}>Future</Text>
            </View>
          </View>
        </View>

        {/* ── 8-week bar chart ── */}
        <View style={[styles.card, shadows.small]}>
          <Text style={styles.cardTitle}>Weekly Progress</Text>
          <Text style={styles.cardSubtitle}>Last 8 weeks</Text>
          <WeeklyBarChart
            logs={allLogs}
            habit={habit}
            habitColor={habitColor}
          />
        </View>

        {/* ── Habit info ── */}
        <View style={[styles.card, shadows.small]}>
          <Text style={styles.cardTitle}>Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="repeat-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoLabel}>Frequency</Text>
            <Text style={styles.infoValue}>{frequencyLabel(habit)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {format(new Date(habit.createdAt), 'MMM d, yyyy')}
            </Text>
          </View>
          {habit.description ? (
            <>
              <View style={styles.divider} />
              <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={[styles.infoValue, { flex: 1 }]}>{habit.description}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* ── Quick log button ── */}
        <TouchableOpacity
          style={[
            styles.logButton,
            {
              backgroundColor: isCompletedToday ? colors.successLight : habitColor,
              borderColor: isCompletedToday ? colors.success : habitColor,
            },
            shadows.medium,
          ]}
          onPress={handleToggleToday}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isCompletedToday ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={22}
            color={isCompletedToday ? colors.success : colors.white}
          />
          <Text
            style={[
              styles.logButtonText,
              { color: isCompletedToday ? colors.success : colors.white },
            ]}
          >
            {isCompletedToday ? "Undo Today's Log" : 'Mark Complete for Today'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  centeredLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
    paddingTop: spacing.xl + spacing.xl, // extra room for actions row
  },
  heroActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  heroActionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  heroIconBg: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    paddingHorizontal: spacing.md,
  },

  // ── Stats row ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.extraBold,
    lineHeight: typography.fontSize.xxxl * 1.1,
  },
  statUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },

  // ── Generic card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  // ── Completion rate card ──────────────────────────────────────────────────
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completionLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  completionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },

  // ── Legend ────────────────────────────────────────────────────────────────
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // ── Info rows ─────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'right',
    maxWidth: '55%',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },

  // ── Log button ────────────────────────────────────────────────────────────
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    height: 56,
    marginTop: spacing.md,
    borderWidth: 1.5,
  },
  logButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
});
