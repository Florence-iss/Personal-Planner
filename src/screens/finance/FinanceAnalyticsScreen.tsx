import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

type PeriodOption = 'Week' | 'Month' | '3 Months' | 'Year';
const PERIOD_OPTIONS: PeriodOption[] = ['Week', 'Month', '3 Months', 'Year'];

interface CategoryBarProps {
  name: string;
  amount: number;
  total: number;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

function CategoryBar({ name, amount, total, color, icon }: CategoryBarProps) {
  const ratio = total > 0 ? amount / total : 0;
  return (
    <View style={styles.categoryBarRow}>
      <View style={[styles.catIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.catContent}>
        <View style={styles.catHeader}>
          <Text style={styles.catName}>{name}</Text>
          <Text style={styles.catAmount}>${amount.toFixed(2)}</Text>
        </View>
        <View style={styles.catTrack}>
          <View style={[styles.catFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

export default function FinanceAnalyticsScreen(): React.JSX.Element {
  const [period, setPeriod] = useState<PeriodOption>('Month');
  const [view, setView] = useState<'Expenses' | 'Income'>('Expenses');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodRow}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.periodChip, period === opt && styles.periodChipActive]}
              onPress={() => setPeriod(opt)}
            >
              <Text style={[styles.periodChipText, period === opt && styles.periodChipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, shadows.small]}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryAmount, { color: colors.income }]}>$0.00</Text>
          </View>
          <View style={[styles.summaryCard, shadows.small]}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryAmount, { color: colors.expense }]}>$0.00</Text>
          </View>
        </View>

        {/* Net savings */}
        <View style={[styles.netCard, shadows.medium]}>
          <View>
            <Text style={styles.netLabel}>Net Savings</Text>
            <Text style={styles.netAmount}>$0.00</Text>
          </View>
          <View style={styles.netBadge}>
            <Ionicons name="trending-up" size={16} color={colors.success} />
            <Text style={styles.netBadgeText}>0%</Text>
          </View>
        </View>

        {/* Chart placeholder */}
        <View style={[styles.chartCard, shadows.small]}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Spending Trend</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            <View style={styles.chartBars}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <View key={i} style={styles.chartBarGroup}>
                  <View style={[styles.chartBar, { height: 4 + Math.random() * 60 }]} />
                  <Text style={styles.chartBarLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Category breakdown */}
        <View style={[styles.breakdownCard, shadows.small]}>
          {/* View toggle */}
          <View style={styles.viewToggle}>
            {(['Expenses', 'Income'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.viewChip, view === v && styles.viewChipActive]}
                onPress={() => setView(v)}
              >
                <Text style={[styles.viewChipText, view === v && styles.viewChipTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.breakdownTitle}>By Category</Text>

          {/* Empty state */}
          <View style={styles.breakdownEmpty}>
            <Ionicons name="pie-chart-outline" size={36} color={colors.border} />
            <Text style={styles.breakdownEmptyText}>No data for this period</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  periodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  periodChipTextActive: {
    color: colors.white,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },

  netCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  netLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  netAmount: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  netBadgeText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semiBold,
  },

  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartHeader: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  chartPlaceholder: {
    height: 100,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
  },
  chartBarGroup: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  chartBar: {
    width: 12,
    backgroundColor: colors.primaryShades[200],
    borderRadius: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },

  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  viewChip: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  viewChipActive: {
    backgroundColor: colors.white,
    ...shadows.small,
  },
  viewChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
  },
  viewChipTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semiBold,
  },
  breakdownTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  breakdownEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  breakdownEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },

  // Category bar (used if data present)
  categoryBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catContent: { flex: 1 },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  catAmount: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semiBold,
  },
  catTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
