/**
 * CollectionValueCard — total value, quarterly change, animated sparkline bar chart.
 */

import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { View as MotiView } from 'moti';
import { useThemeColors, spacing, radius } from '@/theme';
import { SparklineChart } from './SparklineChart';

type CollectionValueCardProps = {
  totalValue: string;
  quarterlyChange: string;
  quarterlyChangePositive?: boolean;
  pieceCount: number;
  /** Sparkline data (heights 0-100). */
  sparkData: number[];
  sparkLabels?: string[];
  delay?: number;
};

function CollectionValueCardInner({
  totalValue,
  quarterlyChange,
  quarterlyChangePositive = true,
  pieceCount,
  sparkData,
  sparkLabels,
  delay = 600,
}: CollectionValueCardProps) {
  const colors = useThemeColors();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay }}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.kicker, { color: colors.gold }]}>
        COLLECTION VALUE
      </Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {totalValue}
        </Text>
        <Text
          style={[
            styles.change,
            {
              color: quarterlyChangePositive ? colors.success : colors.error,
            },
          ]}
        >
          {quarterlyChange}
        </Text>
      </View>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        This quarter · across {pieceCount} pieces
      </Text>
      <View style={styles.chartWrap}>
        <SparklineChart data={sparkData} labels={sparkLabels} />
      </View>
    </MotiView>
  );
}

export const CollectionValueCard = memo(CollectionValueCardInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    padding: 14,
  },
  kicker: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.24,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  value: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.01,
  },
  change: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
  sub: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
    marginTop: 2,
  },
  chartWrap: {
    marginTop: 10,
  },
});

// Silence unused

