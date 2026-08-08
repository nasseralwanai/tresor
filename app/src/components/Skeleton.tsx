/**
 * Skeleton — animated loading placeholder blocks with shimmer effect.
 *
 * Uses moti for a subtle pulse/shimmer animation on dark backgrounds.
 * The shimmer uses a gradient overlay that sweeps across the block.
 */

import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useThemeColors } from '@/theme';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const colors = useThemeColors();

  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.8 }}
      transition={{
        type: 'timing',
        duration: 1000,
        loop: true,
        repeatReverse: true,
      }}
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceElevated,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonCard — card-shaped skeleton for grid layouts.
 * Matches the layout of item cards in collection/wishlist grids.
 */
export function SkeletonCard({ width = '100%' }: { width?: number | string }) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        {
          width: width as any,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Skeleton width="100%" height={130} borderRadius={0} />
      <View style={styles.cardInfo}>
        <Skeleton width={60} height={9} style={{ marginBottom: 4 }} />
        <Skeleton width={100} height={14} />
      </View>
    </View>
  );
}

/**
 * SkeletonRow — list-shaped skeleton for feed/activity layouts.
 * Matches the layout of single-line rows in activity feed.
 */
export function SkeletonRow() {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Skeleton width={26} height={26} borderRadius={13} />
        <View style={{ flex: 1 }}>
          <Skeleton width={200} height={12} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={9} />
        </View>
      </View>
    </View>
  );
}

/**
 * SkeletonMemberCard — member card skeleton for circle screen.
 */
export function SkeletonMemberCard() {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.memberCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Skeleton width={46} height={46} borderRadius={23} />
        <View style={{ flex: 1 }}>
          <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  cardInfo: {
    padding: 11,
    gap: 4,
  },
  row: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
  },
  memberCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
  },
});
