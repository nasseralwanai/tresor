/**
 * GentleNudgeCard — warm gold-tinted card with icon circle, nudge text, chevron.
 * Tappable with press animation.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing } from '@/theme';
import { hapticLight } from '@/lib/haptics';

type GentleNudgeCardProps = {
  title: string;
  subtitle: string;
  iconName?: string;
  onPress?: () => void;
  delay?: number;
};

export function GentleNudgeCard({
  title,
  subtitle,
  iconName = 'clock-outline',
  onPress,
  delay = 350,
}: GentleNudgeCardProps) {
  const colors = useThemeColors();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay }}
    >
      <Pressable
        onPress={() => {
          hapticLight();
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: `${colors.gold}14`,
          },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: colors.surface }]}
        >
          <MaterialCommunityIcons
            name={iconName as any}
            size={14}
            color={colors.gold}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={14}
          color={colors.gold}
        />
      </Pressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'Jost',
    fontSize: 11.5,
    fontWeight: '500',
  },
  subtitle: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
    marginTop: 1,
  },
});

// Silence unused import
void spacing;
