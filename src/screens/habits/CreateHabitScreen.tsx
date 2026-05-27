/**
 * CreateHabitScreen — create or edit a habit.
 *
 * Fields: name, description, icon picker, color picker, frequency +
 * day/count selectors. Writes to Firestore via habitsService.createHabit.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { HabitsStackParamList } from '../../navigation/stacks/HabitsStack';
import { HabitFrequency } from '../../types';
import { useHabitsStore } from '../../store/habitsStore';
import { useAuthStore, selectUserId } from '../../store/authStore';
import { createHabit, updateHabit } from '../../services/habitsService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreateHabitNavProp = StackNavigationProp<HabitsStackParamList, 'CreateHabit'>;
type CreateHabitRouteProp = RouteProp<HabitsStackParamList, 'CreateHabit'>;

interface Props {
  navigation: CreateHabitNavProp;
  route: CreateHabitRouteProp;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOR_OPTIONS: string[] = colors.palette.slice(0, 8);

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICON_OPTIONS: IoniconsName[] = [
  'fitness-outline',
  'book-outline',
  'water-outline',
  'moon-outline',
  'heart-outline',
  'bicycle-outline',
  'restaurant-outline',
  'headset-outline',
  'walk-outline',
  'barbell-outline',
  'leaf-outline',
  'musical-notes-outline',
  'code-slash-outline',
  'brush-outline',
  'cafe-outline',
  'camera-outline',
  'airplane-outline',
  'home-outline',
  'people-outline',
  'star-outline',
];

const FREQUENCY_OPTIONS: { value: HabitFrequency; label: string; description: string }[] = [
  { value: 'daily',  label: 'Daily',  description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Specific days' },
  { value: 'custom', label: 'Custom', description: 'Times per week' },
];

// Sun=0 … Sat=6; labels shown Mon–Sun in the day picker
const WEEK_DAYS: { index: number; short: string; full: string }[] = [
  { index: 1, short: 'Mon', full: 'Monday' },
  { index: 2, short: 'Tue', full: 'Tuesday' },
  { index: 3, short: 'Wed', full: 'Wednesday' },
  { index: 4, short: 'Thu', full: 'Thursday' },
  { index: 5, short: 'Fri', full: 'Friday' },
  { index: 6, short: 'Sat', full: 'Saturday' },
  { index: 0, short: 'Sun', full: 'Sunday' },
];

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

interface SectionLabelProps {
  text: string;
}

function SectionLabel({ text }: SectionLabelProps): React.JSX.Element {
  return <Text style={styles.label}>{text}</Text>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateHabitScreen({ navigation }: Props): React.JSX.Element {
  const userId = useAuthStore(selectUserId);
  const addHabit = useHabitsStore((s) => s.addHabit);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState<IoniconsName>('fitness-outline');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  // For weekly: which days (0-6) are targeted
  const [targetDays, setTargetDays] = useState<number[]>([]);
  // For custom: how many times per week
  const [timesPerWeek, setTimesPerWeek] = useState<number>(3);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);

  // ── Derived preview ────────────────────────────────────────────────────────

  const previewLabel = name.trim() || 'New Habit';

  // ── Day toggling ───────────────────────────────────────────────────────────

  const toggleDay = useCallback((dayIndex: number) => {
    setTargetDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex],
    );
  }, []);

  // ── Times per week controls ────────────────────────────────────────────────

  const decreaseTimes = useCallback(() => {
    setTimesPerWeek((n) => Math.max(1, n - 1));
  }, []);

  const increaseTimes = useCallback(() => {
    setTimesPerWeek((n) => Math.min(7, n + 1));
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!name.trim()) {
      setNameError(true);
      return 'Habit name is required.';
    }
    if (frequency === 'weekly' && targetDays.length === 0) {
      return 'Please select at least one day of the week.';
    }
    return null;
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave(): Promise<void> {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!userId) {
      setError('You must be signed in to create habits.');
      return;
    }

    setLoading(true);
    try {
      const resolvedTargetDays: number[] =
        frequency === 'weekly'
          ? [...targetDays].sort((a, b) => a - b)
          : frequency === 'custom'
          ? []   // custom uses targetCount, not specific days
          : [];  // daily = every day

      const resolvedTargetCount =
        frequency === 'custom' ? timesPerWeek : 1;

      const created = await createHabit(userId, {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon as string,
        color: selectedColor,
        frequency,
        targetDays: resolvedTargetDays,
        targetCount: resolvedTargetCount,
      });

      addHabit(created);
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create habit.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Error banner ── */}
          {error !== null && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Live preview badge ── */}
          <View style={[styles.previewRow, shadows.small]}>
            <View style={[styles.previewIconBg, { backgroundColor: selectedColor }]}>
              <Ionicons name={selectedIcon} size={28} color={colors.white} />
            </View>
            <View style={styles.previewTextCol}>
              <Text style={styles.previewName} numberOfLines={1}>
                {previewLabel}
              </Text>
              {description.trim().length > 0 && (
                <Text style={styles.previewDesc} numberOfLines={1}>
                  {description.trim()}
                </Text>
              )}
            </View>
          </View>

          {/* ── Name ── */}
          <View style={styles.section}>
            <SectionLabel text="Habit Name *" />
            <TextInput
              style={[styles.input, nameError && styles.inputError]}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameError(false);
                setError(null);
              }}
              placeholder="e.g. Morning run, Read 30 min"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="next"
              maxLength={80}
            />
          </View>

          {/* ── Description ── */}
          <View style={styles.section}>
            <SectionLabel text="Description (optional)" />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Why does this habit matter to you?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          {/* ── Icon picker ── */}
          <View style={styles.section}>
            <SectionLabel text="Icon" />
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => {
                const isSelected = selectedIcon === icon;
                return (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      isSelected && {
                        backgroundColor: selectedColor,
                        borderColor: selectedColor,
                      },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={icon}
                      size={22}
                      color={isSelected ? colors.white : colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Color picker ── */}
          <View style={styles.section}>
            <SectionLabel text="Color" />
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => {
                const isSelected = selectedColor === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorSwatch, { backgroundColor: c }]}
                    onPress={() => setSelectedColor(c)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Frequency ── */}
          <View style={styles.section}>
            <SectionLabel text="Frequency" />
            <View style={styles.freqGrid}>
              {FREQUENCY_OPTIONS.map((opt) => {
                const isActive = frequency === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.freqCard,
                      isActive && {
                        backgroundColor: selectedColor + '18',
                        borderColor: selectedColor,
                      },
                    ]}
                    onPress={() => {
                      setFrequency(opt.value);
                      // Reset sub-selections when frequency changes
                      setTargetDays([]);
                      setTimesPerWeek(3);
                    }}
                    activeOpacity={0.8}
                  >
                    {isActive && (
                      <View
                        style={[
                          styles.freqActiveDot,
                          { backgroundColor: selectedColor },
                        ]}
                      />
                    )}
                    <Text
                      style={[
                        styles.freqCardTitle,
                        isActive && { color: selectedColor },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.freqCardDesc}>{opt.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Day selector (weekly) ── */}
          {frequency === 'weekly' && (
            <View style={styles.section}>
              <SectionLabel text="Which days?" />
              <View style={styles.daysRow}>
                {WEEK_DAYS.map((day) => {
                  const isSelected = targetDays.includes(day.index);
                  return (
                    <TouchableOpacity
                      key={day.index}
                      style={[
                        styles.dayChip,
                        isSelected && {
                          backgroundColor: selectedColor,
                          borderColor: selectedColor,
                        },
                      ]}
                      onPress={() => toggleDay(day.index)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          isSelected && { color: colors.white },
                        ]}
                      >
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Times per week (custom) ── */}
          {frequency === 'custom' && (
            <View style={styles.section}>
              <SectionLabel text="Times per week" />
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[styles.counterButton, timesPerWeek <= 1 && styles.counterButtonDisabled]}
                  onPress={decreaseTimes}
                  disabled={timesPerWeek <= 1}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={timesPerWeek <= 1 ? colors.textMuted : colors.textPrimary}
                  />
                </TouchableOpacity>
                <View style={styles.counterValueBox}>
                  <Text style={[styles.counterValue, { color: selectedColor }]}>
                    {timesPerWeek}
                  </Text>
                  <Text style={styles.counterUnit}>
                    {timesPerWeek === 1 ? 'time' : 'times'} / week
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.counterButton, timesPerWeek >= 7 && styles.counterButtonDisabled]}
                  onPress={increaseTimes}
                  disabled={timesPerWeek >= 7}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={timesPerWeek >= 7 ? colors.textMuted : colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Save button ── */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: selectedColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                <Text style={styles.saveButtonText}>Save Habit</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
  },

  // ── Preview ───────────────────────────────────────────────────────────────
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  previewIconBg: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewTextCol: {
    flex: 1,
  },
  previewName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  previewDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.sm + 2,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },

  // ── Icon grid ─────────────────────────────────────────────────────────────
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Color picker ──────────────────────────────────────────────────────────
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  // ── Frequency ─────────────────────────────────────────────────────────────
  freqGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  freqCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  freqActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  freqCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  freqCardDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ── Day chips ─────────────────────────────────────────────────────────────
  daysRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayChip: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textSecondary,
  },

  // ── Custom counter ────────────────────────────────────────────────────────
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  counterButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonDisabled: {
    opacity: 0.4,
  },
  counterValueBox: {
    flex: 1,
    alignItems: 'center',
  },
  counterValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize.xxl * 1.2,
  },
  counterUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },

  // ── Save button ───────────────────────────────────────────────────────────
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    height: 54,
    marginTop: spacing.sm,
    ...shadows.medium,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
