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
import { ScheduleStackParamList } from '../../navigation/stacks/ScheduleStack';

type EventDetailNavProp = StackNavigationProp<ScheduleStackParamList, 'EventDetail'>;
type EventDetailRouteProp = RouteProp<ScheduleStackParamList, 'EventDetail'>;

interface Props {
  navigation: EventDetailNavProp;
  route: EventDetailRouteProp;
}

interface InfoRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBg}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function EventDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { eventId } = route.params;

  // In production this would load from eventsStore / eventsService
  const loading = false;

  if (loading) {
    return (
      <View style={styles.centeredLoader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Color bar */}
        <View style={[styles.colorBar, { backgroundColor: colors.primary }]} />

        {/* Title card */}
        <View style={[styles.titleCard, shadows.small]}>
          <Text style={styles.eventTitle}>Event Details</Text>
          <Text style={styles.eventId} numberOfLines={1}>ID: {eventId}</Text>
        </View>

        {/* Info rows */}
        <View style={[styles.infoCard, shadows.small]}>
          <InfoRow icon="calendar-outline" label="Date" value="—" />
          <View style={styles.separator} />
          <InfoRow icon="time-outline" label="Time" value="—" />
          <View style={styles.separator} />
          <InfoRow icon="document-text-outline" label="Description" value="No description" />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit Event</Text>
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
  colorBar: {
    height: 6,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  titleCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  eventTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  eventId: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  infoIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryShades[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
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
