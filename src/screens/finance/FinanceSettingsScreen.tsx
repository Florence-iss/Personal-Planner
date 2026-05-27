import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

interface SettingRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBgColor: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
}

function SettingRow({
  icon,
  iconBgColor,
  iconColor,
  label,
  value,
  onPress,
  rightElement,
  showArrow = true,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {value !== undefined && (
          <Text style={styles.settingValue}>{value}</Text>
        )}
        {rightElement}
        {showArrow && !rightElement && (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionCard, shadows.small]}>
        {children}
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

export default function FinanceSettingsScreen(): React.JSX.Element {
  const [smsParsingEnabled, setSmsParsingEnabled] = useState(false);
  const [emailParsingEnabled, setEmailParsingEnabled] = useState(false);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* General */}
        <Section title="General">
          <SettingRow
            icon="cash-outline"
            iconBgColor={colors.primaryShades[50]}
            iconColor={colors.primary}
            label="Default Currency"
            value="USD"
            onPress={() => {}}
          />
          <Separator />
          <SettingRow
            icon="calendar-outline"
            iconBgColor={colors.infoLight}
            iconColor={colors.info}
            label="Budget Period"
            value="Monthly"
            onPress={() => {}}
          />
          <Separator />
          <SettingRow
            icon="grid-outline"
            iconBgColor={colors.successLight}
            iconColor={colors.success}
            label="Manage Categories"
            onPress={() => {}}
          />
        </Section>

        {/* Auto-parsing */}
        <Section title="Auto Transaction Parsing">
          <SettingRow
            icon="chatbubble-outline"
            iconBgColor={colors.primaryShades[50]}
            iconColor={colors.primary}
            label="SMS Parsing"
            showArrow={false}
            rightElement={
              <Switch
                value={smsParsingEnabled}
                onValueChange={setSmsParsingEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
          <Separator />
          <SettingRow
            icon="mail-outline"
            iconBgColor={colors.infoLight}
            iconColor={colors.info}
            label="Email Parsing"
            showArrow={false}
            rightElement={
              <Switch
                value={emailParsingEnabled}
                onValueChange={setEmailParsingEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
          {smsParsingEnabled && (
            <>
              <Separator />
              <SettingRow
                icon="code-slash-outline"
                iconBgColor={colors.warningLight}
                iconColor={colors.warning}
                label="SMS Patterns"
                onPress={() => {}}
              />
            </>
          )}
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            icon="bar-chart-outline"
            iconBgColor={colors.successLight}
            iconColor={colors.success}
            label="Weekly Report"
            showArrow={false}
            rightElement={
              <Switch
                value={weeklyReportEnabled}
                onValueChange={setWeeklyReportEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
          <Separator />
          <SettingRow
            icon="warning-outline"
            iconBgColor={colors.warningLight}
            iconColor={colors.warning}
            label="Budget Alerts"
            showArrow={false}
            rightElement={
              <Switch
                value={budgetAlertsEnabled}
                onValueChange={setBudgetAlertsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
        </Section>

        {/* Data */}
        <Section title="Data">
          <SettingRow
            icon="download-outline"
            iconBgColor={colors.primaryShades[50]}
            iconColor={colors.primary}
            label="Export Transactions"
            onPress={() => {}}
          />
          <Separator />
          <SettingRow
            icon="cloud-upload-outline"
            iconBgColor={colors.infoLight}
            iconColor={colors.info}
            label="Import from CSV"
            onPress={() => {}}
          />
          <Separator />
          <SettingRow
            icon="trash-outline"
            iconBgColor={colors.errorLight}
            iconColor={colors.error}
            label="Clear All Transactions"
            onPress={() => {}}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },

  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 34 + spacing.md, // align with text start
  },
});
