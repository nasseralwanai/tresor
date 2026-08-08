/**
 * CategoryShelf — horizontal scroll row with mini cards (photo, brand, model, price, status dot).
 * Used for "Your Bags", "Your Watches", etc.
 */

import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { hapticLight } from '@/lib/haptics';
import { formatCurrencyCompact } from '@/lib/format';
import type { Item } from '@/types/items';

type CategoryShelfProps = {
  title: string;
  items: Item[];
  onPressItem?: (item: Item) => void;
  delay?: number;
};

function CategoryShelfInner({
  title,
  items,
  onPressItem,
  delay = 650,
}: CategoryShelfProps) {
  const colors = useThemeColors();

  if (items.length === 0) return null;

  const handlePressItem = useCallback((item: Item) => {
    hapticLight();
    onPressItem?.(item);
  }, [onPressItem]);

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 500, delay }}
    >
      <View style={styles.shelfSection}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {items.length} {items.length === 1 ? 'piece' : 'pieces'}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {items.map((item) => {
            const isLent = item.status === 'borrowed';
            const isPrivate = item.is_private;
            return (
              <Pressable
                key={item.id}
                onPress={() => handlePressItem(item)}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <View style={styles.miniCard}>
                  <View style={{ position: 'relative' }}>
                    {isPrivate ? (
                      <View
                        style={[
                          styles.photo,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="lock"
                          size={20}
                          color={colors.textSecondary}
                        />
                      </View>
                    ) : (
                      <ItemPhotoPlaceholder
                        letter={item.brand}
                        size={100}
                        imageUrl={item.primary_image_url}
                        seed={item.id}
                        style={styles.photo}
                      />
                    )}
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isLent
                            ? colors.gold
                            : isPrivate
                              ? colors.textSecondary
                              : colors.success,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.brand,
                      {
                        color: isPrivate
                          ? colors.textSecondary
                          : colors.textPrimary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isPrivate ? 'Private' : item.brand}
                  </Text>
                  <Text
                    style={[
                      styles.model,
                      {
                        color: isPrivate
                          ? colors.textSecondary
                          : colors.textSecondary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isPrivate ? 'Hidden piece' : item.model_name || '—'}
                  </Text>
                  <Text style={[styles.price, { color: colors.gold }]}>
                    {isPrivate ? '—' : formatCurrencyCompact(item.estimated_value, item.currency)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </MotiView>
  );
}

export const CategoryShelf = memo(CategoryShelfInner);

const styles = StyleSheet.create({
  shelfSection: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg + 6,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '500',
  },
  count: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
  },
  row: {
    gap: 10,
    paddingHorizontal: spacing.lg + 6,
    paddingRight: spacing.lg + 6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  miniCard: {
    width: 100,
    flexShrink: 0,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: radius.sm,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brand: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
  },
  model: {
    fontFamily: 'Jost',
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
  price: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});
