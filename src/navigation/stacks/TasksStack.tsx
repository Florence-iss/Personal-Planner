import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { colors, typography } from '../../theme';
import TasksScreen from '../../screens/tasks/TasksScreen';
import CreateTaskScreen from '../../screens/tasks/CreateTaskScreen';
import TaskDetailScreen from '../../screens/tasks/TaskDetailScreen';

export type TasksStackParamList = {
  Tasks: undefined;
  /**
   * `defaultDate` — pre-fills the due date when creating from a calendar context.
   * `task`        — when present, the form opens in "edit" mode pre-populated with
   *                 the supplied task data.
   */
  CreateTask: { defaultDate?: string; task?: import('../../types').Task };
  TaskDetail: { taskId: string };
};

const Stack = createStackNavigator<TasksStackParamList>();

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

export default function TasksStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      <Stack.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ title: 'Tasks' }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: 'New Task' }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Task Details' }}
      />
    </Stack.Navigator>
  );
}
