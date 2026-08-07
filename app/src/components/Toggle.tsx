/**
 * Toggle — switch component for privacy/lendable/dark mode toggles.
 */

import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useThemeColors, spacing } from '@/theme';
import { hapticLight } from '@/lib/haptics';

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Accessibility label describing what this toggle controls. */
  accessibilityLabel?: string;
};

export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel }: ToggleProps) {
  const colors = useThemeColors();

  const handlePress = () => {
    if (disabled) return;
    hapticLight();
    onValueChange(!value);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.accent : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          { transform: [{ translateX: value ? 16 : 0 }] },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 36,
    height: 20,
    borderRadius: 999,
    padding: 2,
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
});
