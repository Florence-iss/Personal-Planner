import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, typography } from '../theme';
import DashboardStack from './stacks/DashboardStack';
import ScheduleStack from './stacks/ScheduleStack';
import TasksStack from './stacks/TasksStack';
import HabitsStack from './stacks/HabitsStack';
import FinanceStack from './stacks/FinanceStack';

export type MainTabParamList = {
  DashboardTab: undefined;
  ScheduleTab: undefined;
  TasksTab: undefined;
  HabitsTab: undefined;
  FinanceTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName, focused: boolean): React.JSX.Element {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconName)}
      size={24}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

export default function MainNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => tabIcon('home', focused),
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleStack}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ focused }) => tabIcon('calendar', focused),
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksStack}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ focused }) => tabIcon('checkmark-circle', focused),
        }}
      />
      <Tab.Screen
        name="HabitsTab"
        component={HabitsStack}
        options={{
          tabBarLabel: 'Habits',
          tabBarIcon: ({ focused }) => tabIcon('repeat', focused),
        }}
      />
      <Tab.Screen
        name="FinanceTab"
        component={FinanceStack}
        options={{
          tabBarLabel: 'Finance',
          tabBarIcon: ({ focused }) => tabIcon('wallet', focused),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    marginTop: 2,
  },
});
