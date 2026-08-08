/**
 * Onboarding Screen 1 — Welcome
 *
 * Ironwork logo, "Your private circle for luxury collections"
 * Dark editorial aesthetic. "Get Started" goes to How It Works.
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { DarkThemeColors, serifFont, bodyFont, spacing } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { IronworkMark } from '@/components/IronworkMark';

const colors = DarkThemeColors;

export default function OnboardingWelcomeScreen() {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top hairline accent */}
      <MotiView
        from={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ type: 'timing', duration: 800, delay: 200 }}
        style={styles.topAccent}
      >
        <View style={[styles.hairline, { backgroundColor: colors.gold }]} />
      </MotiView>

      <View style={styles.content}>
        {/* Ironwork logo */}
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 100 }}
        >
          <View style={styles.logoWrap}>
            <IronworkMark size={80} variant="gold-on-dark" />
          </View>
        </MotiView>

        {/* Wordmark */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 400 }}
        >
          <Text style={styles.wordmark}>Tresor</Text>
        </MotiView>

        {/* Hairline divider */}
        <MotiView
          from={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 0.4, scaleX: 1 }}
          transition={{ type: 'timing', duration: 600, delay: 600 }}
          style={styles.dividerWrap}
        >
          <View style={[styles.hairlineSmall, { backgroundColor: colors.gold }]} />
        </MotiView>

        {/* Tagline */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 700 }}
        >
          <Text style={styles.tagline}>
            Your private circle for{'\n'}luxury collections.
          </Text>
        </MotiView>
      </View>

      {/* Footer — CTA */}
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 80, delay: 900 }}
        style={styles.footer}
      >
        <PrimaryButton
          label="Get Started"
          onPress={() => router.push('/onboarding/how-it-works' as any)}
          accessibilityLabel="Get started with onboarding"
          accessibilityRole="button"
        />
      </MotiView>

      {/* Bottom hairline accent */}
      <MotiView
        from={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ type: 'timing', duration: 800, delay: 1000 }}
        style={styles.bottomAccent}
      >
        <View style={[styles.hairline, { backgroundColor: colors.gold }]} />
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  topAccent: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  hairline: {
    width: 60,
    height: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: spacing.xl,
  },
  wordmark: {
    fontFamily: serifFont,
    fontSize: 52,
    fontWeight: '400',
    letterSpacing: 6,
    color: colors.cream,
    textAlign: 'center',
  },
  dividerWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  hairlineSmall: {
    width: 40,
    height: 1,
  },
  tagline: {
    fontFamily: bodyFont,
    fontSize: 16,
    fontWeight: '300',
    lineHeight: 26,
    letterSpacing: 0.5,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    minWidth: '100%',
  },
  bottomAccent: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
});
