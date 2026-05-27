import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, shadows, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { signOut } from '../../services/auth';

type SettingsRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  destructive?: boolean;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

function SettingsRow({ row }: { row: SettingsRow }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={row.onPress}
      disabled={!row.onPress && !row.toggle}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIconContainer, row.destructive && styles.rowIconDestructive]}>
        <Ionicons
          name={row.icon}
          size={20}
          color={row.destructive ? colors.error : colors.primary}
        />
      </View>
      <Text style={[styles.rowLabel, row.destructive && styles.rowLabelDestructive]}>
        {row.label}
      </Text>
      <View style={styles.rowRight}>
        {row.value ? (
          <Text style={styles.rowValue}>{row.value}</Text>
        ) : null}
        {row.toggle ? (
          <Switch
            value={row.toggleValue}
            onValueChange={row.onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        ) : row.onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            clearUser();
          },
        },
      ]
    );
  }

  const accountRows: SettingsRow[] = [
    {
      icon: 'person-outline',
      label: 'Display Name',
      value: user?.displayName ?? '—',
    },
    {
      icon: 'mail-outline',
      label: 'Email',
      value: user?.email ?? '—',
    },
  ];

  const notificationRows: SettingsRow[] = [
    {
      icon: 'notifications-outline',
      label: 'Enable Notifications',
      toggle: true,
      toggleValue: notificationsEnabled,
      onToggle: setNotificationsEnabled,
    },
    {
      icon: 'alarm-outline',
      label: 'Task Reminder Lead Time',
      value: '15 min',
      onPress: () => Alert.alert('Coming Soon', 'Configure reminder lead time.'),
    },
    {
      icon: 'sunny-outline',
      label: 'Daily Planning Reminder',
      value: '8:00 AM',
      onPress: () => Alert.alert('Coming Soon', 'Set your daily planning time.'),
    },
    {
      icon: 'moon-outline',
      label: 'Habit Check-in Reminder',
      value: '9:00 PM',
      onPress: () => Alert.alert('Coming Soon', 'Set your habit check-in time.'),
    },
  ];

  const integrationsRows: SettingsRow[] = [
    {
      icon: 'logo-google',
      label: 'Google Calendar Sync',
      value: 'Not connected',
      onPress: () => Alert.alert('Google Calendar', 'Connect via Google Sign-In with calendar scope.'),
    },
    {
      icon: 'mail-outline',
      label: 'Gmail Auto-Record',
      value: 'Not connected',
      onPress: () => navigation.navigate('FinanceTab' as never),
    },
  ];

  const dataRows: SettingsRow[] = [
    {
      icon: 'folder-outline',
      label: 'Manage Categories',
      onPress: () => Alert.alert('Coming Soon', 'Category management.'),
    },
    {
      icon: 'download-outline',
      label: 'Export Data',
      onPress: () => Alert.alert('Coming Soon', 'Export your data as CSV or JSON.'),
    },
  ];

  const dangerRows: SettingsRow[] = [
    {
      icon: 'log-out-outline',
      label: 'Sign Out',
      onPress: handleSignOut,
      destructive: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {(user?.displayName ?? user?.email ?? 'U')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        <SectionHeader title="Account" />
        <View style={styles.section}>
          {accountRows.map((row) => (
            <SettingsRow key={row.label} row={row} />
          ))}
        </View>

        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          {notificationRows.map((row) => (
            <SettingsRow key={row.label} row={row} />
          ))}
        </View>

        <SectionHeader title="Integrations" />
        <View style={styles.section}>
          {integrationsRows.map((row) => (
            <SettingsRow key={row.label} row={row} />
          ))}
        </View>

        <SectionHeader title="Data" />
        <View style={styles.section}>
          {dataRows.map((row) => (
            <SettingsRow key={row.label} row={row} />
          ))}
        </View>

        <SectionHeader title="" />
        <View style={styles.section}>
          {dangerRows.map((row) => (
            <SettingsRow key={row.label} row={row} />
          ))}
        </View>

        <Text style={styles.version}>Personal Planner v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
  },
  avatarInitial: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowIconDestructive: {
    backgroundColor: colors.error + '15',
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  rowLabelDestructive: {
    color: colors.error,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
