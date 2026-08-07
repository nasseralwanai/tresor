/**
 * SearchBar — reusable text search input with magnify icon and clear button.
 * Warm Atelier styled: cream/surface background, gold accent icon, charcoal text.
 */

import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onClear,
}: SearchBarProps) {
  const colors = useThemeColors();

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={18}
        color={colors.accent}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.textPrimary }]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} accessibilityRole="button" accessibilityLabel="Clear search" accessibilityHint="Clear the search text" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.clearBtn}>
          <MaterialCommunityIcons
            name="close"
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    padding: 0,
  },
  clearBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
