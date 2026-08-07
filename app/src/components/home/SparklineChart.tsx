/**
 * SparklineChart — animated bar chart for collection value growth.
 * Bars animate height on mount using moti (UI thread worklet).
 */

import { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { View as MotiView } from 'moti';
import { useThemeColors, typography } from '@/theme';

type SparklineChartProps = {
  /** Heights as percentages (0–100). */
  data: number[];
  /** Labels under the chart (e.g. ['Jan', 'Apr', 'Aug']). */
  labels?: string[];
};

function SparklineChartInner({ data, labels }: SparklineChartProps) {
  const colors = useThemeColors();

  if (data.length === 0) return null;

  const maxVal = useMemo(() => Math.max(...data, 1), [data]);
  const lastIdx = data.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {data.map((val, idx) => {
          const heightPct = Math.max((val / maxVal) * 100, 6);
          const isLast = idx === lastIdx;
          const isRecent = idx >= data.length - 2 && !isLast;
          const barColor = isLast
            ? colors.gold
            : isRecent
              ? colors.goldLight
              : colors.border;
          return (
            <MotiView
              key={idx}
              from={{ height: 0, opacity: 0 }}
              animate={{ height: `${heightPct}%`, opacity: 1 }}
              transition={{
                type: 'spring',
                delay: 200 + idx * 60,
                stiffness: 120,
                damping: 16,
              }}
              style={[styles.bar, { backgroundColor: barColor }]}
            />
          );
        })}
      </View>
      {labels && (
        <View style={styles.labelsRow}>
          {labels.map((label, idx) => (
            <Text
              key={idx}
              style={[styles.label, { color: colors.textSecondary }]}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export const SparklineChart = memo(SparklineChartInner);

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 28,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  label: {
    ...typography.caption2,
    fontSize: 8,
    letterSpacing: 0.04,
  },
});
