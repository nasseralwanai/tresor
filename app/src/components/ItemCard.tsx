/**
 * ItemCard — featured carousel card (large) for the home screen.
 * Shows brand letter placeholder, brand name, model, and status badge.
 *
 * PRICING PRIVACY: No price is shown on item cards (migration 0016).
 * Prices are only visible on the item detail screen to owners/co-owners.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { ItemPhotoPlaceholder } from './ItemPhotoPlaceholder';
import { Badge, type BadgeVariant } from './Badge';
import { hapticLight } from '@/lib/haptics';
import type { Item } from '@/types/items';

type ItemCardProps = {
  item: Item;
  onPress?: (item: Item) => void;
};

export function ItemCard({ item, onPress }: ItemCardProps) {
  const colors = useThemeColors();

  const handlePress = () => {
    hapticLight();
    onPress?.(item);
  };

  const badgeVariant: BadgeVariant = item.status === 'borrowed' ? 'lent' : 'available';
  const badgeLabel = item.status === 'borrowed' ? 'Lent' : 'Available';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.photoWrap}>
        <ItemPhotoPlaceholder
          letter={item.brand}
          size={130}
          imageUrl={item.primary_image_url}
          seed={item.id}
          style={styles.photo}
        />
        <View style={styles.badgePos}>
          <Badge variant={badgeVariant} label={badgeLabel} />
        </View>
        {item.is_private && (
          <View style={[styles.lockIcon, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="lock" size={12} color={colors.textSecondary} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.brand, { color: colors.accent }]}>{item.brand.toUpperCase()}</Text>
        <Text style={[styles.model, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.model_name || '—'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 210,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
    flexShrink: 0,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 130,
    borderRadius: 0,
  },
  badgePos: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  lockIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: spacing.md - 2,
    gap: 1,
  },
  brand: {
    ...typography.caption2,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  model: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
});
