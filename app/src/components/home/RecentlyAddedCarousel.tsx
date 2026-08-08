/**
 * RecentlyAddedCarousel — horizontal scroll of recent items with photo,
 * brand, model, price, and status badge (Available/Lent).
 */

import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { hapticLight } from '@/lib/haptics';
import { formatCurrencyCompact } from '@/lib/format';
import type { Item } from '@/types/items';

type RecentlyAddedCarouselProps = {
  items: Item[];
  onPressItem?: (item: Item) => void;
  delay?: number;
};

function RecentlyAddedCarouselInner({
  items,
  onPressItem,
  delay = 450,
}: RecentlyAddedCarouselProps) {
  const colors = useThemeColors();

  const handlePressItem = useCallback((item: Item) => {
    hapticLight();
    onPressItem?.(item);
  }, [onPressItem]);

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        RECENTLY ADDED TO YOUR COLLECTION
      </Text>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 500, delay }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {items.map((item) => {
            const isLent = item.status === 'borrowed';
            return (
              <Pressable
                key={item.id}
                onPress={() => handlePressItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.brand} ${item.model_name || 'item'}, ${isLent ? 'lent' : 'available'}`}
                accessibilityHint="View item details"
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.photoWrap}>
                  <ItemPhotoPlaceholder
                    letter={item.brand}
                    size={130}
                    imageUrl={item.primary_image_url}
                    seed={item.id}
                    style={styles.photo}
                  />
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isLent
                          ? `${colors.gold}1A`
                          : `${colors.success}1A`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.badgeDot,
                        {
                          backgroundColor: isLent ? colors.gold : colors.success,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color: isLent ? colors.gold : colors.success,
                        },
                      ]}
                    >
                      {isLent ? 'Lent' : 'Available'}
                    </Text>
                  </View>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.brand, { color: colors.gold }]}>
                    {item.brand.toUpperCase()}
                  </Text>
                  <Text
                    style={[styles.model, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.model_name || '—'}
                  </Text>
                  <Text style={[styles.price, { color: colors.textSecondary }]}>
                    {formatCurrencyCompact(item.estimated_value, item.currency)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </MotiView>
    </View>
  );
}

export const RecentlyAddedCarousel = memo(RecentlyAddedCarouselInner);

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.16,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: spacing.lg + 6,
  },
  carousel: {
    gap: 10,
    paddingHorizontal: spacing.lg + 6,
    paddingRight: spacing.lg + 6,
  },
  card: {
    width: 210,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 130,
    borderRadius: 0,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
  info: {
    padding: spacing.md - 2,
    gap: 1,
  },
  brand: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  model: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  price: {
    fontFamily: 'Jost',
    fontSize: 11,
    marginTop: 2,
  },
});

// Silence unused

