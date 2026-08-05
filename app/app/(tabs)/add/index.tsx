/**
 * Add Item screen — options for adding new items.
 * Photo (AI), Link, Manual entry, and Bulk Import.
 */

import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { hapticLight } from '@/lib/haptics';

export default function AddScreen() {
  const colors = useThemeColors();

  const addOptions = [
    { icon: 'camera-outline', label: 'Photo', subtitle: 'AI identifies your item' },
    { icon: 'link-variant', label: 'Link', subtitle: 'Paste a product URL' },
    { icon: 'pencil-outline', label: 'Manual', subtitle: 'Enter details yourself' },
    { icon: 'view-grid-outline', label: 'Bulk Import', subtitle: 'Scan multiple items at once' },
  ];

  const handleOption = (label: string) => {
    hapticLight();
    if (label === 'Bulk Import') {
      router.push('/add/bulk-import' as any);
    } else if (label === 'Manual') {
      router.push('/add/manual' as any);
    } else {
      Alert.alert('Coming Soon', `${label} entry is not yet available. Use Manual entry for now.`);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Item' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.optionsContainer}>
          {addOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => handleOption(option.label)}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.surfaceElevated }]}>
                <MaterialCommunityIcons name={option.icon as any} size={28} color={colors.accent} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{option.label}</Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                  {option.subtitle}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  optionsContainer: { gap: spacing.md },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 0.5,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionText: { flex: 1 },
  optionLabel: {
    ...typography.headline,
    marginBottom: 2,
  },
  optionSubtitle: {
    ...typography.subheadline,
  },
});
