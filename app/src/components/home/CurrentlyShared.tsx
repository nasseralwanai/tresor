/**
 * CurrentlyShared — list of lent items with photo, item name,
 * "With [person] · [duration]", and Nudge button.
 */

import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { NudgeButton } from '@/components/NudgeButton';
import { hapticLight } from '@/lib/haptics';
import type { Item } from '@/types/items';

export type LentItem = {
  item: Item;
  borrowerName: string;
  durationLabel: string;
  /** The borrow_transactions.id — needed for the NudgeButton. */
  borrowId?: string;
};

type CurrentlySharedProps = {
  lentItems: LentItem[];
  onPressItem?: (item: Item) => void;
  delay?: number;
};

function CurrentlySharedInner({
  lentItems,
  onPressItem,
  delay = 500,
}: CurrentlySharedProps) {
  const colors = useThemeColors();

  if (lentItems.length === 0) return null;

  const handlePressItem = useCallback((item: Item) => {
    hapticLight();
    onPressItem?.(item);
  }, [onPressItem]);

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        CURRENTLY SHARED
      </Text>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 500, delay }}
      >
        <View style={styles.list}>
          {lentItems.map((lent, idx) => (
            <Pressable
              key={lent.item.id}
              onPress={() => handlePressItem(lent.item)}
              accessibilityRole="button"
              accessibilityLabel={`${lent.item.brand} ${lent.item.model_name}, with ${lent.borrowerName} for ${lent.durationLabel}`}
              accessibilityHint="View item details"
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                idx < lentItems.length - 1 && styles.cardGap,
                pressed && styles.pressed,
              ]}
            >
              <ItemPhotoPlaceholder
                letter={lent.item.brand}
                size={44}
                style={[styles.photo, { backgroundColor: colors.surfaceElevated }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                  {lent.item.brand} {lent.item.model_name}
                </Text>
                <View style={styles.subRow}>
                  <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                    With
                  </Text>
                  <Text style={[styles.subPerson, { color: colors.gold }]}>
                    {lent.borrowerName}
                  </Text>
                  <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                    ·
                  </Text>
                  <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                    {lent.durationLabel}
                  </Text>
                </View>
              </View>
              {lent.borrowId ? (
                <NudgeButton
                  borrowId={lent.borrowId}
                  borrowerName={lent.borrowerName}
                  compact
                />
              ) : (
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  —
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </MotiView>
    </View>
  );
}

export const CurrentlyShared = memo(CurrentlySharedInner);

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
  list: {
    paddingHorizontal: spacing.lg + 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 0.5,
  },
  cardGap: {
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  photo: {
    borderRadius: radius.sm,
  },
  itemName: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '500',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  subLabel: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
  },
  subPerson: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
  muted: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
  },
});

// Silence unused
void typography;
