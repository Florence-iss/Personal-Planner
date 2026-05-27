import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { FinanceStackParamList } from '../../navigation/stacks/FinanceStack';

type TransactionDetailNavProp = StackNavigationProp<FinanceStackParamList, 'TransactionDetail'>;
type TransactionDetailRouteProp = RouteProp<FinanceStackParamList, 'TransactionDetail'>;

interface Props {
  navigation: TransactionDetailNavProp;
  route: TransactionDetailRouteProp;
}

interface DetailRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  valueColor?: string;
}

function DetailRow({ icon, label, value, valueColor }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconBg}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function TransactionDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { transactionId } = route.params;
  const loading = false;

  if (loading) {
    return (
      <View style={styles.centeredLoader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Placeholder: would be expense from financeStore
  const isExpense = true;
  const amountColor = isExpense ? colors.expense : colors.income;
  const amountPrefix = isExpense ? '-' : '+';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount hero */}
        <View style={[styles.heroCard, shadows.medium]}>
          <View style={[styles.heroIconBg, { backgroundColor: isExpense ? colors.expenseLight : colors.incomeLight }]}>
            <Ionicons
              name={isExpense ? 'arrow-down-outline' : 'arrow-up-outline'}
              size={28}
              color={amountColor}
            />
          </View>
          <Text style={[styles.heroAmount, { color: amountColor }]}>
            {amountPrefix}$0.00
          </Text>
          <Text style={styles.heroDescription}>Transaction Details</Text>
          <Text style={styles.heroId} numberOfLines={1}>ID: {transactionId}</Text>
        </View>

        {/* Details */}
        <View style={[styles.detailCard, shadows.small]}>
          <DetailRow icon="calendar-outline" label="Date" value="—" />
          <View style={styles.separator} />
          <DetailRow icon="grid-outline" label="Category" value="—" />
          <View style={styles.separator} />
          <DetailRow
            icon={isExpense ? 'trending-down-outline' : 'trending-up-outline'}
            label="Type"
            value={isExpense ? 'Expense' : 'Income'}
            valueColor={amountColor}
          />
          <View style={styles.separator} />
          <DetailRow icon="document-text-outline" label="Source" value="Manual" />
        </View>

        {/* Status */}
        <View style={[styles.statusCard, shadows.small]}>
          <Text style={styles.statusLabel}>Confirmation Status</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, { color: colors.success }]}>Confirmed</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} activeOpacity={0.85}>
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centeredLoader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroAmount: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.extraBold,
    marginBottom: spacing.xs,
  },
  heroDescription: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroId: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },

  detailCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  detailIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryShades[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
  },

  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1.5,
  },
  editButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryShades[50],
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  deleteButton: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
});
