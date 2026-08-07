/**
 * FilterChip — pill-shaped filter button for horizontal category scrolling.
 * Selected chip has gold background; unselected has surface background.
 */

import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors, typography } from '@/theme';

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? colors.charcoal : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 0.5,
    marginRight: 8,
  },
  label: {
    ...typography.footnote,
    fontSize: 13,
    fontWeight: '500',
  },
});
