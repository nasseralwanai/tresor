/**
 * PieceOfTheDay — featured spotlight card with large photo, brand kicker,
 * model name, estimated value, editorial description, and action buttons.
 * Entrance animation: fade + slide up via moti.
 */

import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { View as MotiView } from 'moti';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { hapticLight } from '@/lib/haptics';
import { formatCurrency } from '@/lib/format';
import { router } from 'expo-router';
import type { Item } from '@/types/items';

type PieceOfTheDayProps = {
  item: Item;
  description?: string;
  style?: ViewStyle;
};

export function PieceOfTheDay({
  item,
  description,
  style,
}: PieceOfTheDayProps) {
  const colors = useThemeColors();

  const editorialDesc =
    description ??
    item.notes ??
    `Acquired ${item.purchase_date ? new Date(item.purchase_date).getFullYear() : 'recently'}. A treasured piece in your collection.`;

  const handleStyleIt = () => {
    hapticLight();
    router.push(`/item/${item.id}` as any);
  };
  const handleViewDetails = () => {
    hapticLight();
    router.push(`/item/${item.id}` as any);
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: 150 }}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {/* Photo area */}
      <View style={styles.photoWrap}>
        {item.primary_image_url ? (
          <Image
            source={{ uri: item.primary_image_url }}
            style={styles.photo}
            contentFit="cover"
            transition={300}
            blurRadius={20}
          />
        ) : (
          <ItemPhotoPlaceholder
            letter={item.brand}
            size={152}
            style={styles.photo}
          />
        )}
        {/* "Piece of the Day" badge */}
        <View style={styles.kickerBadge}>
          <Text style={styles.kickerBadgeText}>Piece of the Day</Text>
        </View>
        {/* Heart icon */}
        <View style={[styles.heartBtn, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons
            name="heart-outline"
            size={14}
            color={colors.textPrimary}
          />
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.gold }]}>
              {item.brand.toUpperCase()}
            </Text>
            <Text
              style={[styles.modelName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.model_name || '—'}
            </Text>
          </View>
          <View style={styles.valueCol}>
            <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>
              EST. VALUE
            </Text>
            <Text style={[styles.valueAmount, { color: colors.gold }]}>
              {formatCurrency(item.estimated_value, item.currency)}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {editorialDesc}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={handleStyleIt}
            activeOpacity={0.85}
            style={[styles.btnAccent, { backgroundColor: colors.gold }]}
          >
            <Text style={[styles.btnAccentText, { color: colors.charcoal }]}>
              Style It
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleViewDetails}
            activeOpacity={0.85}
            style={[styles.btnOutline, { borderColor: colors.border }]}
          >
            <Text style={[styles.btnOutlineText, { color: colors.textPrimary }]}>
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 152,
    borderRadius: 0,
  },
  kickerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(43,37,32,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  kickerBadgeText: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.24,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  heartBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 15,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.24,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  modelName: {
    fontFamily: 'Georgia',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.01,
  },
  valueCol: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '300',
    letterSpacing: 0.04,
  },
  valueAmount: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  description: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '300',
    lineHeight: 1.55 * 11,
    marginTop: 9,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
  },
  btnAccent: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnAccentText: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '500',
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 0.5,
  },
  btnOutlineText: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '500',
  },
});


