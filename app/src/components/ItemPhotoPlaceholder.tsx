/**
 * ItemPhotoPlaceholder — renders a real item photo via expo-image when
 * primary_image_url is available, otherwise a warm gradient background
 * with a serif brand initial at editorial opacity.
 *
 * Each item without a photo gets a deterministic gradient selected from
 * the Warm Atelier palette, so no two items look identical.
 */

import { useMemo } from 'react';
import { Text, StyleSheet, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/theme';

type ItemPhotoPlaceholderProps = {
  /** Brand or item name — first letter is shown as the serif initial. */
  letter: string;
  /** Size in px (rendered as both width and height). */
  size?: number;
  /** Optional real photo URL — when present, renders the actual image. */
  imageUrl?: string | null;
  /** Seed for deterministic gradient selection (item id, name, etc.). */
  seed?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * expo-image expects ImageStyle, but callers pass ViewStyle (width/height/
 * borderRadius/margin). ImageStyle extends ViewStyle so the cast is safe
 * for the shape of props our callers actually use.
 */

/**
 * Warm Atelier gradient palettes. Each pair uses [start, end] colors
 * drawn from the mockup's cream/gold/brown family. Picked deterministically
 * by hashing the seed string so the same item always gets the same gradient.
 */
const GRADIENT_PALETTES: readonly [string, string][] = [
  ['#F5F0EA', '#E8DCC8'], // cream to warm sand
  ['#F0E8DC', '#D4BC94'], // warm to gold-tan
  ['#EDE4D3', '#C4A87E'], // light sand to accent gold
  ['#F5F2ED', '#E0C98A'], // brand cream to gold light
  ['#E8DCC8', '#9B7B5A'], // sand to warm brown
  ['#F0E8DC', '#B8A07A'], // warm to muted bronze
  ['#EFE9E0', '#C9A961'], // light to brand gold
  ['#F5F0EA', '#D4BC94'], // cream to light gold
];

/**
 * Deterministic 0..n hash from a string. Simple FNV-1a style —
 * fast, no deps, stable across renders.
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function ItemPhotoPlaceholder({
  letter,
  size = 100,
  imageUrl,
  seed,
  style,
}: ItemPhotoPlaceholderProps) {
  const colors = useThemeColors();

  // Deterministic gradient — falls back to the letter text if no seed
  const gradientColors = useMemo(() => {
    const seedStr = seed ?? letter ?? 'default';
    const idx = hashString(seedStr) % GRADIENT_PALETTES.length;
    return GRADIENT_PALETTES[idx];
  }, [seed, letter]);

  // --- Real photo ---
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.container,
          { width: size, height: size },
          style,
        ] as StyleProp<ImageStyle>}
        contentFit="cover"
        transition={300}
      />
    );
  }

  // --- Warm gradient placeholder ---
  return (
    <LinearGradient
      colors={[gradientColors[0], gradientColors[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { width: size, height: size, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.34 }]}>
        {letter.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  letter: {
    fontFamily: 'Georgia',
    fontWeight: '500',
    // Editorial warmth: 45% opacity — visible but not loud.
    // Mockup spec is 14% (too faint); Dwight's audit asks for 40-60%.
    color: 'rgba(43,37,32,0.45)',
  },
});
