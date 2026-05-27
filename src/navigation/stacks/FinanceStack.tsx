import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { colors, typography } from '../../theme';
import FinanceScreen from '../../screens/finance/FinanceScreen';
import AddTransactionScreen from '../../screens/finance/AddTransactionScreen';
import TransactionDetailScreen from '../../screens/finance/TransactionDetailScreen';
import BudgetsScreen from '../../screens/finance/BudgetsScreen';
import FinanceAnalyticsScreen from '../../screens/finance/FinanceAnalyticsScreen';
import FinanceSettingsScreen from '../../screens/finance/FinanceSettingsScreen';
import { TransactionType } from '../../types';

export type FinanceStackParamList = {
  Finance: undefined;
  AddTransaction: { type?: TransactionType };
  TransactionDetail: { transactionId: string };
  Budgets: undefined;
  FinanceAnalytics: undefined;
  FinanceSettings: undefined;
};

const Stack = createStackNavigator<FinanceStackParamList>();

const defaultHeaderOptions = {
  headerStyle: {
    backgroundColor: colors.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
  },
  headerBackTitleVisible: false,
};

export default function FinanceStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      <Stack.Screen
        name="Finance"
        component={FinanceScreen}
        options={{ title: 'Finance' }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ title: 'Add Transaction' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: 'Transaction Details' }}
      />
      <Stack.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ title: 'Budgets' }}
      />
      <Stack.Screen
        name="FinanceAnalytics"
        component={FinanceAnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Stack.Screen
        name="FinanceSettings"
        component={FinanceSettingsScreen}
        options={{ title: 'Finance Settings' }}
      />
    </Stack.Navigator>
  );
}
