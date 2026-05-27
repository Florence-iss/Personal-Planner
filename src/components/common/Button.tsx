import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  size?: Size;
  fullWidth?: boolean;
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Size tokens
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<
  Size,
  { paddingHorizontal: number; paddingVertical: number; fontSize: number; iconSize: number }
> = {
  sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: typography.fontSize.sm,
    iconSize: 14,
  },
  md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSize.base,
    iconSize: 18,
  },
  lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.lg,
    iconSize: 20,
  },
};

// ---------------------------------------------------------------------------
// Variant style generators
// ---------------------------------------------------------------------------

function getContainerStyle(variant: Variant, disabled: boolean): ViewStyle {
  const base: ViewStyle = { opacity: disabled ? 0.5 : 1 };

  switch (variant) {
    case 'primary':
      return { ...base, backgroundColor: colors.primary };
    case 'outline':
      return {
        ...base,
        backgroundColor: colors.transparent,
        borderWidth: 1.5,
        borderColor: colors.primary,
      };
    case 'ghost':
      return { ...base, backgroundColor: colors.transparent };
    case 'danger':
      return { ...base, backgroundColor: colors.error };
  }
}

function getLabelColor(variant: Variant): string {
  switch (variant) {
    case 'primary':
      return colors.textOnPrimary;
    case 'outline':
      return colors.primary;
    case 'ghost':
      return colors.primary;
    case 'danger':
      return colors.white;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  size = 'md',
  fullWidth = false,
  style,
}: ButtonProps): React.JSX.Element {
  const sizeConfig = SIZE_CONFIG[size];
  const containerVariantStyle = getContainerStyle(variant, disabled || loading);
  const labelColor = getLabelColor(variant);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.container,
        {
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        containerVariantStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary}
        />
      ) : (
        <View style={styles.inner}>
          {icon ? (
            <Ionicons
              name={icon}
              size={sizeConfig.iconSize}
              color={labelColor}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              {
                fontSize: sizeConfig.fontSize,
                color: labelColor,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: typography.letterSpacing.normal,
  },
});
