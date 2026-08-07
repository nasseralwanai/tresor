/**
 * SectionHeader — Playfair Display heading with hairline divider and
 * optional "See All" link. Used across all feed sections.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme';
import { hapticLight } from '@/lib/haptics';

type SectionHeaderProps = {
  title: string;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
};

export function SectionHeader({ title, showSeeAll, onSeeAll }: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      {showSeeAll && (
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            onSeeAll?.();
          }}
          activeOpacity={0.7}
          style={styles.seeAll}
        >
          <Text style={[styles.seeAllText, { color: colors.gold }]}>See All</Text>
          <MaterialCommunityIcons name="chevron-right" size={11} color={colors.gold} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  seeAllText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.04,
  },
});
