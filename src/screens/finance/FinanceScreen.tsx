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
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { FinanceStackParamList } from '../../navigation/stacks/FinanceStack';

type FinanceNavProp = StackNavigationProp<FinanceStackParamList, 'Finance'>;

interface Props {
  navigation: FinanceNavProp;
}

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

interface QuickActionProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function QuickAction({ icon, label, color, bgColor, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={[styles.quickAction, shadows.small]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FinanceScreen({ navigation }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'All' | 'Income' | 'Expense'>('All');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Finance</Text>
            <Text style={styles.headerSubtitle}>{getCurrentMonthLabel()}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('FinanceSettings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Balance card */}
        <View style={[styles.balanceCard, shadows.medium]}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>$0.00</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <View style={[styles.balanceDot, { backgroundColor: colors.income }]} />
              <View>
                <Text style={styles.balanceItemLabel}>Income</Text>
                <Text style={[styles.balanceItemAmount, { color: colors.income }]}>
                  $0.00
                </Text>
              </View>
            </View>
            <View style={styles.balanceSeparator} />
            <View style={styles.balanceItem}>
              <View style={[styles.balanceDot, { backgroundColor: colors.expense }]} />
              <View>
                <Text style={styles.balanceItemLabel}>Expenses</Text>
                <Text style={[styles.balanceItemAmount, { color: colors.expense }]}>
                  $0.00
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <QuickAction
            icon="add-circle-outline"
            label="Add"
            color={colors.primary}
            bgColor={colors.primaryShades[50]}
            onPress={() => navigation.navigate('AddTransaction', {})}
          />
          <QuickAction
            icon="pie-chart-outline"
            label="Analytics"
            color={colors.info}
            bgColor={colors.infoLight}
            onPress={() => navigation.navigate('FinanceAnalytics')}
          />
          <QuickAction
            icon="wallet-outline"
            label="Budgets"
            color={colors.warning}
            bgColor={colors.warningLight}
            onPress={() => navigation.navigate('Budgets')}
          />
          <QuickAction
            icon="settings-outline"
            label="Settings"
            color={colors.textSecondary}
            bgColor={colors.surface}
            onPress={() => navigation.navigate('FinanceSettings')}
          />
        </View>

        {/* Transactions list */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddTransaction', {})}
            >
              <Text style={styles.sectionAction}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Filter tabs */}
          <View style={styles.filterTabs}>
            {(['All', 'Income', 'Expense'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeTab === tab && styles.filterTabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Empty state */}
          <View style={[styles.emptyCard, shadows.small]}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="receipt-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>
              Track your income and expenses
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate('AddTransaction', {})}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.emptyActionText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, shadows.large]}
        onPress={() => navigation.navigate('AddTransaction', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingBottom: 100, // space for FAB
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingsButton: {
    padding: spacing.xs,
  },

  // Balance card
  balanceCard: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  balanceItemLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  balanceItemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  balanceSeparator: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.md,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },

  // Transactions
  transactionsSection: {
    paddingHorizontal: spacing.lg,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  sectionAction: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
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

  // FAB
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
