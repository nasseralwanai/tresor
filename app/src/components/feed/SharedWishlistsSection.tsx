/**
 * SharedWishlistsSection — Section 4 of the segregated feed.
 * Wishlist cards with name, owner avatar, brand chips, and reaction count.
 */

import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { SectionHeader } from './SectionHeader';
import { hapticLight } from '@/lib/haptics';
import type { SharedWishlist } from '@/lib/feed';

type SharedWishlistsSectionProps = {
  wishlists: SharedWishlist[];
  onSeeAll?: () => void;
  onWishlistPress?: (wishlist: SharedWishlist) => void;
};

function SharedWishlistsSectionInner({
  wishlists,
  onSeeAll,
  onWishlistPress,
}: SharedWishlistsSectionProps) {
  const colors = useThemeColors();

  if (wishlists.length === 0) return null;

  const handlePress = useCallback((wishlist: SharedWishlist) => {
    hapticLight();
    onWishlistPress?.(wishlist);
  }, [onWishlistPress]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450, delay: 240 }}
      style={styles.container}
    >
      <SectionHeader title="Shared Wishlists" showSeeAll onSeeAll={onSeeAll} />
      <View style={styles.list}>
        {wishlists.slice(0, 3).map((wishlist) => (
          <TouchableOpacity
            key={wishlist.id}
            onPress={() => handlePress(wishlist)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${wishlist.name} by ${wishlist.ownerName}, ${wishlist.itemCount} ${wishlist.itemCount === 1 ? 'item' : 'items'}, ${wishlist.reactionCount} ${wishlist.reactionCount === 1 ? 'friend reacted' : 'friends reacted'}`}
            accessibilityHint="View wishlist details"
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Owner row */}
            <View style={styles.ownerRow}>
              <Avatar name={wishlist.ownerName} size="sm" />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.wishlistName, { color: colors.textPrimary }]}
                >
                  {wishlist.name}
                </Text>
                <Text
                  style={[styles.wishlistMeta, { color: colors.textSecondary }]}
                >
                  {wishlist.ownerName} · {wishlist.itemCount}{' '}
                  {wishlist.itemCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>

            {/* Brand chips */}
            {wishlist.brandChips.length > 0 && (
              <View style={styles.chipRow}>
                {wishlist.brandChips.map((brand, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.chip,
                      { backgroundColor: `${colors.gold}12` },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: colors.gold }]}>
                      {brand}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.reactionRow}>
                <MaterialCommunityIcons
                  name="heart-outline"
                  size={11}
                  color={colors.textSecondary}
                />
                <Text style={[styles.reactionText, { color: colors.textSecondary }]}>
                  {wishlist.reactionCount}{' '}
                  {wishlist.reactionCount === 1 ? 'friend reacted' : 'friends reacted'}
                </Text>
              </View>
              <Text style={[styles.viewAll, { color: colors.gold }]}>View all</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </MotiView>
  );
}

export const SharedWishlistsSection = memo(SharedWishlistsSectionInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  list: {
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: spacing.sm + 2,
    marginBottom: 10,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 9,
  },
  wishlistName: {
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '500',
  },
  wishlistMeta: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '300',
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 9,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionText: {
    fontFamily: 'Jost',
    fontSize: 10,
  },
  viewAll: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
});
