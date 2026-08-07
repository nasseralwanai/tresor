/**
 * FilterPills — horizontally scrollable filter row for the feed.
 * Pills: All, Borrows, Items, Wishlists, Shares.
 * Active pill uses gold gradient background; inactive uses hairline border.
 */

import { memo, useCallback } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/theme';
import { hapticLight } from '@/lib/haptics';

export type FeedFilter = 'all' | 'borrows' | 'items' | 'wishlists' | 'shares';

type FilterPillsProps = {
  active: FeedFilter;
  onChange: (filter: FeedFilter) => void;
};

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'borrows', label: 'Borrows' },
  { key: 'items', label: 'Items' },
  { key: 'wishlists', label: 'Wishlists' },
  { key: 'shares', label: 'Shares' },
];

function FilterPillsInner({ active, onChange }: FilterPillsProps) {
  const colors = useThemeColors();

  const handlePress = useCallback((key: FeedFilter) => {
    hapticLight();
    onChange(key);
  }, [onChange]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isActive = active === filter.key;
        if (isActive) {
          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => handlePress(filter.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={filter.label}
              accessibilityState={{ selected: true }}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            >
              <LinearGradient
                colors={[colors.goldLight, colors.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pill}
              >
                <Text style={styles.pillTextActive}>{filter.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={filter.key}
            onPress={() => handlePress(filter.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={filter.label}
            accessibilityState={{ selected: false }}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            style={[
              styles.pill,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={[styles.pillText, { color: colors.textSecondary }]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export const FilterPills = memo(FilterPillsInner);

const styles = StyleSheet.create({
  container: {
    gap: 7,
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '500',
  },
  pillTextActive: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
