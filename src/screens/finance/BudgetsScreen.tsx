import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { FinanceStackParamList } from '../../navigation/stacks/FinanceStack';

type BudgetsNavProp = StackNavigationProp<FinanceStackParamList, 'Budgets'>;

interface Props {
  navigation: BudgetsNavProp;
}

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface BudgetCardProps {
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  spent: number;
  limit: number;
  currency: string;
}

function BudgetCard({ name, icon, color, spent, limit, currency }: BudgetCardProps) {
  const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const isOverBudget = spent > limit;
  const barColor = isOverBudget ? colors.error : ratio > 0.75 ? colors.warning : color;
  const remaining = limit - spent;

  return (
    <View style={[styles.budgetCard, shadows.small]}>
      <View style={styles.budgetHeader}>
        <View style={[styles.budgetIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.budgetMeta}>
          <Text style={styles.budgetName}>{name}</Text>
          <Text style={styles.budgetLimit}>
            {currency} {limit.toFixed(2)} budget
          </Text>
        </View>
        <View style={styles.budgetAmounts}>
          <Text style={[styles.budgetSpent, { color: isOverBudget ? colors.error : colors.textPrimary }]}>
            {currency} {spent.toFixed(2)}
          </Text>
          <Text style={[styles.budgetRemaining, { color: isOverBudget ? colors.error : colors.success }]}>
            {isOverBudget ? 'Over by' : 'Left:'} {currency} {Math.abs(remaining).toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={styles.budgetPercent}>{Math.round(ratio * 100)}% used</Text>
    </View>
  );
}

export default function BudgetsScreen({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary bar */}
        <View style={[styles.summaryCard, shadows.medium]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>$0.00</Text>
            <Text style={styles.summaryLabel}>Total Budgeted</Text>
          </View>
          <View style={styles.summarySeparator} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>$0.00</Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>
          <View style={styles.summarySeparator} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>$0.00</Text>
            <Text style={styles.summaryLabel}>Remaining</Text>
          </View>
        </View>

        {/* Month label */}
        <View style={styles.monthRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.monthLabel}>{getCurrentMonthLabel()}</Text>
        </View>

        {/* Empty state */}
        <View style={[styles.emptyCard, shadows.small]}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="wallet-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No budgets set</Text>
          <Text style={styles.emptySubtitle}>
            Set monthly budgets to manage your spending
          </Text>
          <TouchableOpacity style={styles.emptyAction} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.emptyActionText}>Create Budget</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, shadows.large]} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },

  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  summarySeparator: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  monthLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },

  // Budget card
  budgetCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  budgetIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetMeta: { flex: 1 },
  budgetName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  budgetLimit: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  budgetAmounts: { alignItems: 'flex-end' },
  budgetSpent: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 2,
  },
  budgetRemaining: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  budgetPercent: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryShades[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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

  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
