import React, { useState } from 'react';
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { FinanceStackParamList } from '../../navigation/stacks/FinanceStack';
import { TransactionType } from '../../types';

type AddTransactionNavProp = StackNavigationProp<FinanceStackParamList, 'AddTransaction'>;
type AddTransactionRouteProp = RouteProp<FinanceStackParamList, 'AddTransaction'>;

interface Props {
  navigation: AddTransactionNavProp;
  route: AddTransactionRouteProp;
}

export default function AddTransactionScreen({ navigation, route }: Props): React.JSX.Element {
  const initialType: TransactionType = route.params?.type ?? 'expense';

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      return 'Please enter a valid amount greater than zero.';
    }
    if (!description.trim()) return 'Please enter a description.';
    if (!date) return 'Please select a date.';
    return null;
  }

  async function handleSave() {
    setError(null);
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      // Placeholder: wire up financeService.createTransaction here
      navigation.goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  }

  const isIncome = type === 'income';
  const activeColor = isIncome ? colors.income : colors.expense;
  const activeBgColor = isIncome ? colors.incomeLight : colors.expenseLight;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && { backgroundColor: colors.expense, borderColor: colors.expense },
              ]}
              onPress={() => setType('expense')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down-outline"
                size={16}
                color={type === 'expense' ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.typeButtonText, type === 'expense' && { color: colors.white }]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && { backgroundColor: colors.income, borderColor: colors.income },
              ]}
              onPress={() => setType('income')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up-outline"
                size={16}
                color={type === 'income' ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.typeButtonText, type === 'income' && { color: colors.white }]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount display */}
          <View style={[styles.amountCard, { backgroundColor: activeBgColor }]}>
            <Text style={[styles.amountCurrency, { color: activeColor }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: activeColor }]}
              value={amount}
              onChangeText={(v) => { setAmount(v); setError(null); }}
              placeholder="0.00"
              placeholderTextColor={activeColor + '80'}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Error */}
          {error !== null && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="create-outline" size={18} color={colors.textMuted} style={styles.rowIcon} />
              <TextInput
                style={styles.inputInline}
                value={description}
                onChangeText={(v) => { setDescription(v); setError(null); }}
                placeholder="What was this for?"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.inputRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.rowIcon} />
              <TextInput
                style={styles.inputInline}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Category placeholder */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={[styles.inputRow, styles.categoryRow]}>
              <Ionicons name="grid-outline" size={18} color={colors.textMuted} style={styles.rowIcon} />
              <Text style={styles.categoryPlaceholder}>Select category</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: activeColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color={colors.white} />
              : (
                <>
                  <Ionicons
                    name={isIncome ? 'arrow-up-circle' : 'arrow-down-circle'}
                    size={20}
                    color={colors.white}
                  />
                  <Text style={styles.saveButtonText}>
                    Save {isIncome ? 'Income' : 'Expense'}
                  </Text>
                </>
              )
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  typeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textSecondary,
  },

  amountCard: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  amountCurrency: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.xs,
  },
  amountInput: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.bold,
    minWidth: 100,
    textAlign: 'center',
  },

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
  },

  section: { marginBottom: spacing.lg },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  rowIcon: { marginRight: spacing.sm },
  inputInline: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  categoryRow: {
    justifyContent: 'space-between',
  },
  categoryPlaceholder: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
  },

  saveButton: {
    borderRadius: borderRadius.lg,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadows.medium,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  buttonDisabled: { opacity: 0.55 },
});
