/**
 * ItemPhotoPlaceholder — gradient background with serif brand initial.
 * Used when items don't have a photo, matching the mockup's editorial style.
 */

import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/theme';

type ItemPhotoPlaceholderProps = {
  letter: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function ItemPhotoPlaceholder({ letter, size = 100, style }: ItemPhotoPlaceholderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.34 }]}>{letter.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  letter: {
    fontFamily: 'Georgia',
    fontWeight: '500',
    color: 'rgba(43,37,32,0.14)',
  },
});
