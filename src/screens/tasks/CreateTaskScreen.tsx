/**
 * CreateTaskScreen — create a new task or edit an existing one.
 *
 * Receives optional `task` param via navigation. When present, the form is
 * pre-populated and the save action calls updateTask instead of createTask.
 *
 * Fields:
 *  1. Title (required)
 *  2. Description (optional, multiline)
 *  3. Priority selector — High | Medium | Low
 *  4. Due date — tap to open native DateTimePicker
 *  5. Due time — tap to open time picker (optional)
 *  6. Category — chips, tap to select
 *  7. Sub-tasks — add/remove inline
 *  8. Recurring toggle + frequency + day-of-week selector
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Priority, RecurrenceFrequency, SubTask, Task } from '../../types';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import {
  createTask,
  updateTask as svcUpdateTask,
} from '../../services/tasksService';
import { formatDate } from '../../utils/dateUtils';
import { TasksStackParamList } from '../../navigation/stacks/TasksStack';

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------

type Nav = StackNavigationProp<TasksStackParamList, 'CreateTask'>;
type Route = RouteProp<TasksStackParamList, 'CreateTask'>;

interface PriorityOption {
  value: Priority;
  label: string;
  color: string;
}

interface FrequencyOption {
  value: RecurrenceFrequency;
  label: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'high',   label: 'High',   color: colors.priorityHigh },
  { value: 'medium', label: 'Medium', color: colors.priorityMedium },
  { value: 'low',    label: 'Low',    color: colors.priorityLow },
];

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Parse 'HH:mm' string into Date (using today as base). */
function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Format Date to 'HH:mm'. */
function dateToTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Format 'HH:mm' to human-readable '9:30 AM'. */
function formatTimeDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionLabel({ label }: { label: string }): React.JSX.Element {
  return <Text style={sectionStyles.label}>{label}</Text>;
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateTaskScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const existingTask = route.params?.task;
  const isEditing = !!existingTask;

  const { categories, addTask, updateTask: storeUpdateTask } = useTasksStore();
  const user = useAuthStore((s) => s.user);

  // ── Form state ────────────────────────────────────────────────────────────

  const [title, setTitle] = useState(existingTask?.title ?? '');
  const [description, setDescription] = useState(existingTask?.description ?? '');
  const [priority, setPriority] = useState<Priority>(existingTask?.priority ?? 'medium');
  const [categoryId, setCategoryId] = useState<string | undefined>(
    existingTask?.categoryId,
  );
  const [subTasks, setSubTasks] = useState<SubTask[]>(
    existingTask?.subTasks ?? [],
  );
  const [subTaskInput, setSubTaskInput] = useState('');

  // Due date / time
  const [dueDate, setDueDate] = useState<Date | undefined>(
    existingTask?.dueDate ? new Date(existingTask.dueDate + 'T00:00:00') : undefined,
  );
  const [dueTime, setDueTime] = useState<string | undefined>(
    existingTask?.dueTime,
  );

  // DateTimePicker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Recurring
  const [recurring, setRecurring] = useState(!!existingTask?.recurring);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    existingTask?.recurring?.frequency ?? 'weekly',
  );
  const [recurringDays, setRecurringDays] = useState<number[]>(
    existingTask?.recurring?.days ?? [],
  );

  // Save state
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const titleRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  // ── Navigation header ─────────────────────────────────────────────────────

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit Task' : 'New Task',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          style={headerStyles.saveBtn}
          disabled={saving}
          activeOpacity={0.75}
        >
          <Text style={headerStyles.saveBtnText}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, saving, title, description, priority, categoryId, subTasks,
      dueDate, dueTime, recurring, frequency, recurringDays]);

  // ── Sub-task helpers ──────────────────────────────────────────────────────

  const addSubTask = useCallback(() => {
    const text = subTaskInput.trim();
    if (!text) return;
    setSubTasks((prev) => [
      ...prev,
      { id: generateId(), title: text, completed: false },
    ]);
    setSubTaskInput('');
  }, [subTaskInput]);

  const removeSubTask = useCallback((id: string) => {
    setSubTasks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleRecurringDay = useCallback((dayIndex: number) => {
    setRecurringDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort(),
    );
  }, []);

  // ── DateTimePicker handlers ───────────────────────────────────────────────

  const onDateChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (event.type === 'dismissed') { setShowDatePicker(false); return; }
      if (selected) setDueDate(selected);
      if (Platform.OS === 'ios') setShowDatePicker(false);
    },
    [],
  );

  const onTimeChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') setShowTimePicker(false);
      if (event.type === 'dismissed') { setShowTimePicker(false); return; }
      if (selected) setDueTime(dateToTimeString(selected));
      if (Platform.OS === 'ios') setShowTimePicker(false);
    },
    [],
  );

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    // Validate
    if (!title.trim()) {
      setTitleError('Title is required.');
      titleRef.current?.focus();
      return;
    }
    if (!user?.uid) {
      Alert.alert('Error', 'You must be signed in to save a task.');
      return;
    }

    setSaving(true);
    try {
      const dueDateStr = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
        : undefined;

      const recurringRule =
        recurring
          ? {
              frequency,
              interval: 1,
              days: frequency === 'weekly' ? recurringDays : [],
            }
          : undefined;

      if (isEditing && existingTask) {
        const updates: Partial<Task> & { userId: string } = {
          userId: user.uid,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDateStr,
          dueTime: dueTime || undefined,
          categoryId: categoryId || undefined,
          subTasks,
          recurring: recurringRule,
          completed: existingTask.completed,
        };
        await svcUpdateTask(existingTask.id, updates);
        storeUpdateTask(existingTask.id, updates);
      } else {
        const newTask = await createTask(user.uid, {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDateStr,
          dueTime: dueTime || undefined,
          categoryId: categoryId || undefined,
          subTasks,
          completed: false,
          recurring: recurringRule,
        });
        addTask(newTask);
      }
      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save task.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [
    title, description, priority, dueDate, dueTime, categoryId, subTasks,
    recurring, frequency, recurringDays, user, isEditing, existingTask,
    navigation, addTask, storeUpdateTask,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Title ── */}
          <View style={styles.section}>
            <SectionLabel label="Title *" />
            <TextInput
              ref={titleRef}
              style={[styles.textInput, titleError ? styles.textInputError : null]}
              value={title}
              onChangeText={(v) => { setTitle(v); setTitleError(null); }}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textMuted}
              autoFocus={!isEditing}
              returnKeyType="next"
              onSubmitEditing={() => descRef.current?.focus()}
            />
            {titleError ? (
              <View style={styles.inlineError}>
                <Ionicons name="alert-circle" size={13} color={colors.error} />
                <Text style={styles.inlineErrorText}>{titleError}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Description ── */}
          <View style={styles.section}>
            <SectionLabel label="Description" />
            <TextInput
              ref={descRef}
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details… (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Priority ── */}
          <View style={styles.section}>
            <SectionLabel label="Priority" />
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((opt) => {
                const active = priority === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.priorityBtn,
                      active
                        ? { backgroundColor: opt.color, borderColor: opt.color }
                        : { borderColor: opt.color },
                    ]}
                    onPress={() => setPriority(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: active ? colors.white : opt.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityBtnLabel,
                        active ? { color: colors.white } : { color: opt.color },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Due Date ── */}
          <View style={styles.section}>
            <SectionLabel label="Due Date" />
            <View style={styles.rowGroup}>
              <TouchableOpacity
                style={[styles.fieldRow, styles.fieldRowFlex]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                <Text
                  style={[
                    styles.fieldRowText,
                    !dueDate && styles.fieldRowPlaceholder,
                  ]}
                >
                  {dueDate ? formatDate(dueDate, 'EEE, MMM d, yyyy') : 'Select a date (optional)'}
                </Text>
                {dueDate ? (
                  <TouchableOpacity
                    onPress={() => setDueDate(undefined)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
              </TouchableOpacity>

              {/* ── Due Time ── */}
              <TouchableOpacity
                style={[styles.fieldRow, styles.fieldRowFlex, styles.fieldRowBorderTop]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                <Text
                  style={[
                    styles.fieldRowText,
                    !dueTime && styles.fieldRowPlaceholder,
                  ]}
                >
                  {dueTime ? formatTimeDisplay(dueTime) : 'Select a time (optional)'}
                </Text>
                {dueTime ? (
                  <TouchableOpacity
                    onPress={() => setDueTime(undefined)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Category ── */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <SectionLabel label="Category" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {/* None chip */}
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !categoryId && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategoryId(undefined)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.categoryChipLabel,
                      !categoryId && styles.categoryChipLabelSelected,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => {
                  const active = categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        active && { backgroundColor: cat.color, borderColor: cat.color },
                      ]}
                      onPress={() => setCategoryId(active ? undefined : cat.id)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: active ? colors.white : cat.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryChipLabel,
                          active && { color: colors.white },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Sub-tasks ── */}
          <View style={styles.section}>
            <SectionLabel label="Sub-tasks" />
            {subTasks.map((st) => (
              <View key={st.id} style={styles.subTaskRow}>
                <Ionicons
                  name="ellipse-outline"
                  size={16}
                  color={colors.textMuted}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={styles.subTaskTitle} numberOfLines={2}>
                  {st.title}
                </Text>
                <TouchableOpacity
                  onPress={() => removeSubTask(st.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add sub-task input row */}
            <View style={styles.subTaskInputRow}>
              <TextInput
                style={styles.subTaskInput}
                value={subTaskInput}
                onChangeText={setSubTaskInput}
                placeholder="Add a sub-task…"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={addSubTask}
              />
              <TouchableOpacity
                style={[
                  styles.subTaskAddBtn,
                  !subTaskInput.trim() && styles.subTaskAddBtnDisabled,
                ]}
                onPress={addSubTask}
                disabled={!subTaskInput.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Recurring ── */}
          <View style={styles.section}>
            <View style={styles.recurringHeader}>
              <View style={styles.recurringHeaderLeft}>
                <Ionicons name="repeat-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.recurringHeaderLabel}>Recurring</Text>
              </View>
              <Switch
                value={recurring}
                onValueChange={setRecurring}
                trackColor={{ false: colors.border, true: colors.primaryShades[300] }}
                thumbColor={recurring ? colors.primary : colors.white}
                ios_backgroundColor={colors.border}
              />
            </View>

            {recurring && (
              <View style={styles.recurringBody}>
                {/* Frequency */}
                <Text style={styles.recurringSubLabel}>Frequency</Text>
                <View style={styles.frequencyRow}>
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const active = frequency === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.freqBtn, active && styles.freqBtnActive]}
                        onPress={() => setFrequency(opt.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.freqBtnLabel,
                            active && styles.freqBtnLabelActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Day selector for weekly */}
                {frequency === 'weekly' && (
                  <View style={styles.dayPicker}>
                    <Text style={styles.recurringSubLabel}>On days</Text>
                    <View style={styles.dayRow}>
                      {WEEKDAYS.map((day, idx) => {
                        const active = recurringDays.includes(idx);
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[styles.dayBtn, active && styles.dayBtnActive]}
                            onPress={() => toggleRecurringDay(idx)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.dayBtnLabel,
                                active && styles.dayBtnLabelActive,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Action buttons ── */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Task'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Native date picker ── */}
      {showDatePicker && (
        <DateTimePicker
          value={dueDate ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* ── Native time picker ── */}
      {showTimePicker && (
        <DateTimePicker
          value={dueTime ? timeStringToDate(dueTime) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          is24Hour={false}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const headerStyles = StyleSheet.create({
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  saveBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Section wrapper
  section: {
    marginBottom: spacing.lg,
  },

  // Text inputs
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.regular,
  },
  textInputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 88,
    paddingTop: spacing.sm + 2,
    textAlignVertical: 'top',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  inlineErrorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
  },

  // Priority
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityBtnLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Field rows (date/time)
  rowGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  fieldRowFlex: {},
  fieldRowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fieldRowText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  fieldRowPlaceholder: {
    color: colors.textMuted,
  },

  // Category
  categoryScroll: {
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  categoryChipLabelSelected: {
    color: colors.white,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Sub-tasks
  subTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subTaskTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  subTaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  subTaskInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  subTaskAddBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTaskAddBtnDisabled: {
    backgroundColor: colors.border,
  },

  // Recurring
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  recurringHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recurringHeaderLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  recurringBody: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  recurringSubLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    marginBottom: spacing.xs,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  freqBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  freqBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  freqBtnLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  freqBtnLabelActive: {
    color: colors.white,
    fontWeight: typography.fontWeight.semiBold,
  },
  dayPicker: {},
  dayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dayBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayBtnLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  dayBtnLabelActive: {
    color: colors.white,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Action buttons
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
  },
  cancelBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
});
