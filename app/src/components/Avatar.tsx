/**
 * Avatar — circular avatar with initials, gold accent style.
 * Falls back to initials when no avatar_url is provided.
 */

import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  name: string;
  size?: AvatarSize;
};

const sizeConfig: Record<AvatarSize, { dimension: number; fontSize: number }> = {
  sm: { dimension: 26, fontSize: 10 },
  md: { dimension: 34, fontSize: 12 },
  lg: { dimension: 46, fontSize: 15 },
};

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const config = sizeConfig[size];
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        { width: config.dimension, height: config.dimension, borderRadius: config.dimension / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: config.fontSize }]}>{initials}</Text>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: '#C9A961',
  },
  initials: {
    ...typography.caption1,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.02,
  },
});
