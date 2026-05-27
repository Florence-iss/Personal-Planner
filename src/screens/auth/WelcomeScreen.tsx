import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type WelcomeNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeNavigationProp;
}

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Hero / logo area */}
        <View style={styles.heroSection}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconBackground}>
              <Ionicons name="calendar-outline" size={80} color={colors.white} />
            </View>
          </View>

          {/* Decorative rings */}
          <View style={styles.ringOuter} />
          <View style={styles.ringInner} />
        </View>

        {/* Text content */}
        <View style={styles.textSection}>
          <Text style={styles.appName}>Personal Planner</Text>
          <Text style={styles.tagline}>
            Organize your day, track your habits,{'\n'}manage your finances.
          </Text>
        </View>

        {/* Feature chips */}
        <View style={styles.featuresRow}>
          {['Tasks', 'Habits', 'Finance', 'Schedule'].map((label) => (
            <View key={label} style={styles.featureChip}>
              <Text style={styles.featureChipText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlinedButton}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.75}
          >
            <Text style={styles.outlinedButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Free to use. No credit card required.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    width: 200,
    height: 200,
  },
  iconWrapper: {
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
  },
  ringOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: colors.primaryShades[200],
    opacity: 0.5,
  },
  ringInner: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    borderColor: colors.primaryShades[300],
    opacity: 0.4,
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  textSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacing.tight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },

  // ── Feature chips ─────────────────────────────────────────────────────────
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureChip: {
    backgroundColor: colors.primaryShades[50],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primaryShades[200],
  },
  featureChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonSection: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    ...shadows.medium,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: typography.letterSpacing.wide,
  },
  outlinedButton: {
    backgroundColor: colors.transparent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  outlinedButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: typography.letterSpacing.wide,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footerNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
