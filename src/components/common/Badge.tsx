import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { borderRadius, spacing, typography } from '../../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  color: string;
  textColor?: string;
  size?: BadgeSize;
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Size tokens
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<BadgeSize, { paddingHorizontal: number; paddingVertical: number; fontSize: number; borderRadius: number }> = {
  sm: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    fontSize: typography.fontSize.xs,
    borderRadius: borderRadius.sm,
  },
  md: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.fontSize.sm,
    borderRadius: borderRadius.sm,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Badge({
  label,
  color,
  textColor = '#FFFFFF',
  size = 'md',
  style,
}: BadgeProps): React.JSX.Element {
  const config = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          borderRadius: config.borderRadius,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontSize: config.fontSize,
            color: textColor,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: typography.fontWeight.semiBold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
});
