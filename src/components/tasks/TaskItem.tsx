/**
 * TaskItem — swipeable task row for list views.
 *
 * Swipe left to reveal a red delete button.
 * Tap checkbox to toggle completion.
 * Tap row body to open detail.
 */

import React, { useRef, useCallback } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Task, Category } from '../../types';
import { formatDate } from '../../utils/dateUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DELETE_BUTTON_WIDTH = 72;
const SWIPE_THRESHOLD = DELETE_BUTTON_WIDTH * 0.6;

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------

function priorityColor(priority: Task['priority']): string {
  switch (priority) {
    case 'high':
      return colors.priorityHigh;
    case 'medium':
      return colors.priorityMedium;
    case 'low':
      return colors.priorityLow;
  }
}

function priorityLabel(priority: Task['priority']): string {
  switch (priority) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Med';
    case 'low':
      return 'Low';
  }
}

// ---------------------------------------------------------------------------
// Due date helpers
// ---------------------------------------------------------------------------

function isDueDateOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskItemProps {
  task: Task;
  categories: Category[];
  onToggleComplete: (task: Task) => void;
  onPress: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TaskItem({
  task,
  categories,
  onToggleComplete,
  onPress,
  onDelete,
}: TaskItemProps): React.JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  const category = categories.find((c) => c.id === task.categoryId);
  const isOverdue =
    !task.completed && task.dueDate ? isDueDateOverdue(task.dueDate) : false;

  // ── PanResponder ──────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only capture horizontal swipes with a meaningful horizontal delta
        return (
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderGrant: () => {
        translateX.setOffset(isSwipeOpen.current ? -DELETE_BUTTON_WIDTH : 0);
        translateX.setValue(0);
      },
      onPanResponderMove: (_evt, gestureState) => {
        const clampedDx = Math.max(
          -DELETE_BUTTON_WIDTH,
          Math.min(0, gestureState.dx),
        );
        translateX.setValue(clampedDx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        translateX.flattenOffset();
        const currentValue = isSwipeOpen.current
          ? gestureState.dx - DELETE_BUTTON_WIDTH
          : gestureState.dx;

        if (currentValue < -SWIPE_THRESHOLD) {
          // Snap open
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
          }).start(() => {
            isSwipeOpen.current = true;
          });
        } else {
          // Snap closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            isSwipeOpen.current = false;
          });
        }
      },
    }),
  ).current;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      isSwipeOpen.current = false;
    });
  }, [translateX]);

  const handleToggle = useCallback(() => {
    if (isSwipeOpen.current) {
      handleClose();
      return;
    }
    onToggleComplete(task);
  }, [task, onToggleComplete, handleClose]);

  const handlePress = useCallback(() => {
    if (isSwipeOpen.current) {
      handleClose();
      return;
    }
    onPress(task);
  }, [task, onPress, handleClose]);

  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [task.id, onDelete]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Delete button revealed by swipe */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Swipeable row */}
      <Animated.View
        style={[styles.row, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Category color indicator */}
        <View
          style={[
            styles.categoryBar,
            { backgroundColor: category?.color ?? colors.border },
          ]}
        />

        {/* Checkbox */}
        <TouchableOpacity
          onPress={handleToggle}
          style={styles.checkboxHitArea}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View
            style={[
              styles.checkbox,
              task.completed && styles.checkboxChecked,
            ]}
          >
            {task.completed && (
              <Ionicons name="checkmark" size={12} color={colors.white} />
            )}
          </View>
        </TouchableOpacity>

        {/* Content */}
        <TouchableOpacity
          style={styles.content}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, task.completed && styles.titleCompleted]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>

          <View style={styles.metaRow}>
            {/* Priority badge */}
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityColor(task.priority) + '22' },
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
                  styles.priorityText,
                  { color: priorityColor(task.priority) },
                ]}
              >
                {priorityLabel(task.priority)}
              </Text>
            </View>

            {/* Due date chip */}
            {task.dueDate ? (
              <View
                style={[
                  styles.dueDateChip,
                  isOverdue
                    ? styles.dueDateChipOverdue
                    : styles.dueDateChipNormal,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={10}
                  color={isOverdue ? colors.error : colors.textMuted}
                  style={{ marginRight: 3 }}
                />
                <Text
                  style={[
                    styles.dueDateText,
                    isOverdue && styles.dueDateTextOverdue,
                  ]}
                >
                  {formatDate(task.dueDate, 'MMM d')}
                </Text>
              </View>
            ) : null}

            {/* Subtask count */}
            {task.subTasks.length > 0 && (
              <View style={styles.subtaskBadge}>
                <Ionicons
                  name="list-outline"
                  size={10}
                  color={colors.textMuted}
                  style={{ marginRight: 3 }}
                />
                <Text style={styles.subtaskText}>
                  {task.subTasks.filter((s) => s.completed).length}/
                  {task.subTasks.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.small,
  },

  // ── Delete button ─────────────────────────────────────────────────────────
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.error,
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Swipeable row ─────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    minHeight: 64,
    paddingRight: spacing.md,
  },

  // ── Category bar ─────────────────────────────────────────────────────────
  categoryBar: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
    marginRight: spacing.sm,
  },

  // ── Checkbox ──────────────────────────────────────────────────────────────
  checkboxHitArea: {
    padding: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
  },
  titleRow: {
    marginBottom: 6,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },

  // ── Meta row ──────────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  priorityText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
  },
  dueDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  dueDateChipNormal: {
    backgroundColor: colors.surface,
  },
  dueDateChipOverdue: {
    backgroundColor: colors.errorLight,
  },
  dueDateText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
  },
  dueDateTextOverdue: {
    color: colors.error,
  },
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  subtaskText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
  },
});
