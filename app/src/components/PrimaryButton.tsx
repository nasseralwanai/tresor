/**
 * PrimaryButton — luxury-styled CTA with haptic feedback.
 * Used across all auth screens for consistency.
 */

import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { hapticLight } from '@/lib/haptics';

type PrimaryButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
} & Omit<TouchableOpacityProps, 'style'>;

export function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  ...rest
}: PrimaryButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const handlePress = (e: any) => {
    if (isDisabled) return;
    hapticLight();
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.button,
        { backgroundColor: colors.accent, opacity: isDisabled ? 0.5 : 1 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.charcoal} />
      ) : (
        <Text style={[styles.label, { color: colors.charcoal }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    ...typography.headline,
    fontSize: 17,
  },
});
