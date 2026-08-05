/**
 * Card — solid surface with hairline border and subtle shadow.
 * The foundational container used across all screens.
 */

import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors, radius, spacing } from '@/theme';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
} & Omit<ViewProps, 'style'>;

export function Card({ children, style, ...rest }: CardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.charcoal,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
});
