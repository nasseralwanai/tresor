/**
 * StyleOfTheWeek — editorial card with small photo, italic intro, item name,
 * resting duration, and Style button.
 */

import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { useThemeColors, spacing, radius } from '@/theme';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { hapticLight } from '@/lib/haptics';
import type { Item } from '@/types/items';

type StyleOfTheWeekProps = {
  item: Item;
  restingDays: number;
  onPress?: () => void;
  onStyle?: () => void;
  delay?: number;
};

function StyleOfTheWeekInner({
  item,
  restingDays,
  onPress,
  onStyle,
  delay = 400,
}: StyleOfTheWeekProps) {
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    hapticLight();
    onPress?.();
  }, [onPress]);

  const handleStyle = useCallback(() => {
    hapticLight();
    onStyle?.();
  }, [onStyle]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay }}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Style of the Week. ${item.brand} ${item.model_name}. Resting for ${restingDays} days`}
        accessibilityHint="View item details"
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.kicker, { color: colors.gold }]}>
          STYLE OF THE WEEK
        </Text>
        <View style={styles.row}>
          <ItemPhotoPlaceholder
            letter={item.brand}
            size={56}
            imageUrl={item.primary_image_url}
            seed={item.id}
            style={styles.photo}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              This week, we're drawn to…
            </Text>
            <Text style={[styles.itemName, { color: colors.textPrimary }]}>
              {item.brand} {item.model_name}
            </Text>
            <Text style={[styles.resting, { color: colors.textSecondary }]}>
              Resting for {restingDays} days · Ready for an outing
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleStyle}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Style"
            accessibilityHint="View styling suggestions for this item"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.styleBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.styleBtnText, { color: colors.textPrimary }]}>
              Style
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </MotiView>
  );
}

export const StyleOfTheWeek = memo(StyleOfTheWeekInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: 14,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  kicker: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.24,
    textTransform: 'uppercase',
    marginBottom: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photo: {
    borderRadius: radius.sm,
  },
  intro: {
    fontFamily: 'Georgia',
    fontSize: 11,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  itemName: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  resting: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
    marginTop: 2,
  },
  styleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 0.5,
  },
  styleBtnText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
});

// Silence unused

