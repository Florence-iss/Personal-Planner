import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../theme';
import DashboardScreen from '../../screens/dashboard/DashboardScreen';
import SettingsScreen from '../../screens/settings/SettingsScreen';

export type DashboardStackParamList = {
  Dashboard: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<DashboardStackParamList>();

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
    fontWeight: typography.fontWeight.semiBold as any,
  },
  headerBackTitleVisible: false,
};

export default function DashboardStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          headerShown: false,
          // Settings icon is rendered inline in DashboardScreen's own header
        })}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
