/**
 * HabitCard — a single habit row displayed in the habits list.
 *
 * Shows: colored left-border accent, icon, name, streak count,
 * and a completion toggle button.
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Habit } from '../../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HabitCardProps {
  habit: Habit;
  isCompletedToday: boolean;
  currentStreak: number;
  onToggle: (habitId: string) => void;
  onPress: (habit: Habit) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HabitCard({
  habit,
  isCompletedToday,
  currentStreak,
  onToggle,
  onPress,
}: HabitCardProps): React.JSX.Element {
  const handleToggle = useCallback(() => {
    onToggle(habit.id);
  }, [habit.id, onToggle]);

  const handlePress = useCallback(() => {
    onPress(habit);
  }, [habit, onPress]);

  return (
    <View style={[styles.card, shadows.small]}>
      {/* Colored left accent border */}
      <View style={[styles.accentBar, { backgroundColor: habit.color }]} />

      {/* Icon area */}
      <TouchableOpacity
        style={[styles.iconContainer, { backgroundColor: habit.color + '20' }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={habit.icon as React.ComponentProps<typeof Ionicons>['name']}
          size={22}
          color={habit.color}
        />
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.habitName} numberOfLines={1}>
          {habit.name}
        </Text>

        <View style={styles.streakRow}>
          {currentStreak > 0 ? (
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noStreakText}>Start your streak</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Toggle button */}
      <TouchableOpacity
        onPress={handleToggle}
        style={styles.toggleHitArea}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.toggleCircle,
            isCompletedToday && {
              backgroundColor: habit.color,
              borderColor: habit.color,
            },
          ]}
        >
          {isCompletedToday && (
            <Ionicons name="checkmark" size={14} color={colors.white} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    paddingRight: spacing.md,
    minHeight: 68,
    overflow: 'hidden',
  },

  // ── Left accent bar ───────────────────────────────────────────────────────
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },

  // ── Icon ──────────────────────────────────────────────────────────────────
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  habitName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },

  // ── Streak ────────────────────────────────────────────────────────────────
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  streakEmoji: {
    fontSize: 11,
    marginRight: 3,
  },
  streakText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.warningDark,
  },
  noStreakText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.regular,
  },

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggleHitArea: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
