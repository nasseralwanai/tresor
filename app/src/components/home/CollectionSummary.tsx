/**
 * CollectionSummary — horizontal strip of 4 stat cells with hairline dividers.
 * Numbers in serif (Playfair-style), labels in small caps.
 */

import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { View as MotiView } from 'moti';
import { useThemeColors, typography } from '@/theme';

type StatCell = {
  value: string;
  label: string;
  isAccent?: boolean;
  flex?: number;
};

type CollectionSummaryProps = {
  pieces: number;
  aedValue: string;
  lentOut: number;
  inCircle: number;
};

function CollectionSummaryInner({
  pieces,
  aedValue,
  lentOut,
  inCircle,
}: CollectionSummaryProps) {
  const colors = useThemeColors();

  const cells: StatCell[] = useMemo(() => [
    { value: String(pieces), label: 'Pieces', flex: 1 },
    { value: aedValue, label: 'AED Value', isAccent: true, flex: 1.3 },
    { value: String(lentOut), label: 'Lent Out', flex: 1 },
    { value: String(inCircle), label: 'In Circle', flex: 1 },
  ], [pieces, aedValue, lentOut, inCircle]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: 200 }}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {cells.map((cell, idx) => (
        <View
          key={cell.label}
          style={[
            styles.cell,
            { flex: cell.flex ?? 1 },
            idx < cells.length - 1 && {
              borderRightWidth: 0.5,
              borderRightColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.value,
              { color: cell.isAccent ? colors.gold : colors.textPrimary },
            ]}
          >
            {cell.value}
          </Text>
          <Text
            style={[styles.label, { color: colors.textSecondary }]}
          >
            {cell.label}
          </Text>
        </View>
      ))}
    </MotiView>
  );
}

export const CollectionSummary = memo(CollectionSummaryInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  cell: {
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  value: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '500',
  },
  label: {
    ...typography.caption2,
    fontSize: 8.5,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
