import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { colors, typography } from '../../theme';
import HabitsScreen from '../../screens/habits/HabitsScreen';
import CreateHabitScreen from '../../screens/habits/CreateHabitScreen';
import HabitDetailScreen from '../../screens/habits/HabitDetailScreen';

export type HabitsStackParamList = {
  Habits: undefined;
  CreateHabit: undefined;
  HabitDetail: { habitId: string };
};

const Stack = createStackNavigator<HabitsStackParamList>();

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

export default function HabitsStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      <Stack.Screen
        name="Habits"
        component={HabitsScreen}
        options={{ title: 'Habits' }}
      />
      <Stack.Screen
        name="CreateHabit"
        component={CreateHabitScreen}
        options={{ title: 'New Habit' }}
      />
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={{ title: 'Habit Details' }}
      />
    </Stack.Navigator>
  );
}
