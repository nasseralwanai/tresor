/**
 * IronworkMark — The Trésor brand mark (Door Cut 2 — The Ironwork)
 *
 * Extracted from design/logo-vault-arch-v8.html.
 * Three concentric arches receding inward, a center seam, and a sill line.
 * The door you cannot move — forged mass, the vault sealed.
 *
 * CRITICAL: react-native-svg requires PascalCase elements.
 * Do NOT use <path>, <line>, <g> — use <Path>, <Line>, <G>.
 */

import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

type IronworkVariant = 'gold-on-dark' | 'ink-on-light';

type IronworkMarkProps = {
  size?: number;
  variant?: IronworkVariant;
  style?: any;
};

const COLORS: Record<IronworkVariant, {
  stroke: string;
  sill: string;
  fill: string;
  fillOpacity: number;
  depthStroke: string;
  seam: string;
}> = {
  'gold-on-dark': {
    stroke: '#C9A961',
    sill: '#E8D5A3',
    fill: '#C9A961',
    fillOpacity: 0.15,
    depthStroke: '#C9A961',
    seam: '#C9A961',
  },
  'ink-on-light': {
    stroke: '#1A1715',
    sill: '#9A7E4A',
    fill: '#1A1715',
    fillOpacity: 0.06,
    depthStroke: '#1A1715',
    seam: '#1A1715',
  },
};

export function IronworkMark({
  size = 28,
  variant = 'ink-on-light',
  style,
}: IronworkMarkProps) {
  const c = COLORS[variant];
  // At small sizes (< 36px), simplify: drop the depth arch and seam
  const simplified = size < 36;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="ironwork-vermeil" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8D5A3" />
            <Stop offset="42%" stopColor="#C9A961" />
            <Stop offset="100%" stopColor="#9A7E4A" />
          </LinearGradient>
        </Defs>

        {/* Outer arch — frame */}
        <Path
          d="M22 88 L22 46 A28 28 0 0 1 78 46 L78 88"
          fill="none"
          stroke={c.stroke}
          strokeWidth={simplified ? 4 : 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Middle arch — face, with Vermeil wash */}
        <Path
          d="M28 88 L28 46 A22 22 0 0 1 72 46 L72 88"
          fill={variant === 'gold-on-dark' ? 'url(#ironwork-vermeil)' : c.fill}
          fillOpacity={simplified ? 0.18 : c.fillOpacity}
          stroke={c.stroke}
          strokeWidth={simplified ? 2.25 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner depth arch — only at larger sizes */}
        {!simplified && (
          <Path
            d="M34 88 L34 46 A16 16 0 0 1 66 46 L66 88"
            fill="none"
            stroke={c.depthStroke}
            strokeWidth={0.75}
            opacity={0.45}
          />
        )}

        {/* Center seam — only at larger sizes */}
        {!simplified && (
          <Line
            x1="50"
            y1="24"
            x2="50"
            y2="88"
            stroke={c.seam}
            strokeWidth={1}
            opacity={0.3}
          />
        )}

        {/* Sill line — gold-bright on dark, gold-deep on light */}
        <Line
          x1={simplified ? 14 : 16}
          y1="88"
          x2={simplified ? 86 : 84}
          y2="88"
          stroke={c.sill}
          strokeWidth={simplified ? 2.25 : 1.75}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
