/**
 * Onboarding Screen 2 — How It Works
 *
 * Three key features shown with CSS shapes (NO emoji, NO people images):
 * 1. Catalog — a grid of rectangles representing your collection
 * 2. Share with Circle — interlocking rings representing your circle
 * 3. Track Borrows — an arrow representing item movement
 *
 * Dark editorial aesthetic with gold accents.
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { DarkThemeColors, serifFont, bodyFont, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';

const colors = DarkThemeColors;

export default function HowItWorksScreen() {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
        >
          <Text style={styles.title}>How It Works</Text>
          <Text style={styles.subtitle}>
            Three ways Tresor serves your collection.
          </Text>
        </MotiView>

        {/* Feature 1: Catalog */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
          style={styles.featureCard}
        >
          <View style={styles.featureShape}>
            {/* Grid of rectangles representing catalog items */}
            <View style={styles.catalogGrid}>
              <View style={[styles.catalogCell, { backgroundColor: colors.gold }]} />
              <View style={[styles.catalogCell, { backgroundColor: colors.goldDark, opacity: 0.6 }]} />
              <View style={[styles.catalogCell, { backgroundColor: colors.gold, opacity: 0.3 }]} />
              <View style={[styles.catalogCell, { backgroundColor: colors.goldDark, opacity: 0.4 }]} />
              <View style={[styles.catalogCell, { backgroundColor: colors.gold, opacity: 0.7 }]} />
              <View style={[styles.catalogCell, { backgroundColor: colors.goldDark }]} />
            </View>
          </View>
          <Text style={styles.featureTitle}>Catalog Your Collection</Text>
          <Text style={styles.featureDescription}>
            Document every piece with brand, condition, and provenance. Upload
            photos and track authenticity. Your collection, meticulously organized.
          </Text>
        </MotiView>

        {/* Feature 2: Share with Circle */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 400 }}
          style={styles.featureCard}
        >
          <View style={styles.featureShape}>
            {/* Interlocking rings representing your circle */}
            <View style={styles.circleRow}>
              <View style={[styles.ring, { borderColor: colors.gold }]} />
              <View style={[styles.ring, { borderColor: colors.gold, opacity: 0.6, marginLeft: -18 }]} />
              <View style={[styles.ring, { borderColor: colors.gold, opacity: 0.3, marginLeft: -18 }]} />
            </View>
          </View>
          <Text style={styles.featureTitle}>Share with Your Circle</Text>
          <Text style={styles.featureDescription}>
            Create a private circle of trusted collectors. Share pieces, browse
            each other's collections, and discover new treasures together.
          </Text>
        </MotiView>

        {/* Feature 3: Track Borrows */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 600 }}
          style={styles.featureCard}
        >
          <View style={styles.featureShape}>
            {/* Arrow representing item movement */}
            <View style={styles.arrowRow}>
              <View style={[styles.arrowDot, { backgroundColor: colors.gold }]} />
              <View style={styles.arrowLine} />
              <View style={styles.arrowHead} />
              <View style={[styles.arrowDot, { backgroundColor: colors.gold, opacity: 0.3 }]} />
            </View>
          </View>
          <Text style={styles.featureTitle}>Track Borrows</Text>
          <Text style={styles.featureDescription}>
            Lend with confidence. Track who has your pieces, receive gentle
            reminders, and maintain a complete lending history for every item.
          </Text>
        </MotiView>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Continue"
          onPress={() => router.push('/onboarding/join' as any)}
          accessibilityLabel="Continue to join screen"
          accessibilityRole="button"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: serifFont,
    fontSize: 30,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: bodyFont,
    fontSize: 15,
    fontWeight: '300',
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  featureCard: {
    marginBottom: spacing.xl,
  },
  featureShape: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  // Catalog grid
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 120,
    height: 80,
    gap: 6,
  },
  catalogCell: {
    width: 34,
    height: 34,
    borderRadius: 6,
  },
  // Circle rings
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
  },
  // Arrow
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  arrowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  arrowLine: {
    width: 80,
    height: 2,
    backgroundColor: colors.gold,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: colors.gold,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  featureTitle: {
    fontFamily: serifFont,
    fontSize: 22,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontFamily: bodyFont,
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 22,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
