/**
 * LatestItemsSection — Section 2 of the segregated feed.
 * Horizontal scroll of item cards with brand, model, owner avatar,
 * and heart icon with like count.
 */

import { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { SectionHeader } from './SectionHeader';
import type { Item } from '@/types/items';

type LatestItemsSectionProps = {
  items: Item[];
  onItemPress?: (item: Item) => void;
  onSeeAll?: () => void;
};

function LatestItemsSectionInner({
  items,
  onItemPress,
  onSeeAll,
}: LatestItemsSectionProps) {
  const colors = useThemeColors();

  if (items.length === 0) return null;

  const displayItems = useMemo(() => items.slice(0, 10), [items]);
  const handleItemPress = useCallback((item: Item) => {
    onItemPress?.(item);
  }, [onItemPress]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450, delay: 80 }}
      style={styles.container}
    >
      <SectionHeader title="Latest Items" showSeeAll onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${item.brand} ${item.model_name ?? 'item'}, owned by ${item.owner_name}`}
            accessibilityHint="View item details"
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            style={[
              styles.itemCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ItemPhotoPlaceholder
              letter={item.brand}
              size={130}
              style={styles.itemPhoto}
            />
            <View style={styles.itemInfo}>
              <Text style={[styles.brandLabel, { color: colors.gold }]}>
                {item.brand.toUpperCase()}
              </Text>
              <Text
                style={[styles.modelName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.model_name ?? 'Untitled'}
              </Text>
              <View style={styles.itemFooter}>
                <View style={styles.ownerRow}>
                  <Avatar name={item.owner_name} size="sm" />
                  <Text
                    style={[styles.ownerName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.owner_name.split(' ')[0]}
                  </Text>
                </View>
                <View style={styles.likeRow}>
                  <MaterialCommunityIcons
                    name="heart-outline"
                    size={10}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.likeCount, { color: colors.textSecondary }]}>
                    {item.estimated_value ? `${(item.estimated_value / 1000).toFixed(0)}k` : ''}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </MotiView>
  );
}

export const LatestItemsSection = memo(LatestItemsSectionInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  scrollContent: {
    gap: 10,
    paddingHorizontal: 22,
  },
  itemCard: {
    width: 130,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  itemPhoto: {
    width: '100%',
    height: 110,
    borderRadius: 0,
  },
  itemInfo: {
    padding: 9,
  },
  brandLabel: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.12,
    marginBottom: 2,
  },
  modelName: {
    fontFamily: 'Georgia',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 1.2,
    marginBottom: 6,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerName: {
    fontFamily: 'Jost',
    fontSize: 9,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  likeCount: {
    fontFamily: 'Jost',
    fontSize: 9,
  },
});
