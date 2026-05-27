import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { colors, typography } from '../../theme';
import ScheduleScreen from '../../screens/schedule/ScheduleScreen';
import CreateEventScreen from '../../screens/schedule/CreateEventScreen';
import EventDetailScreen from '../../screens/schedule/EventDetailScreen';

export type ScheduleStackParamList = {
  Schedule: undefined;
  CreateEvent: { defaultDate?: string; defaultTime?: string };
  EventDetail: { eventId: string };
};

const Stack = createStackNavigator<ScheduleStackParamList>();

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

export default function ScheduleStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Schedule' }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: 'New Event' }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'Event Details' }}
      />
    </Stack.Navigator>
  );
}
