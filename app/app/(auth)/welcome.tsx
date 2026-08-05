/**
 * Welcome screen — elegant entry point to the onboarding flow.
 * Full-screen with logo, tagline, and CTA.
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';

export default function WelcomeScreen() {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.logoWrap, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="treasure-chest" size={56} color={colors.accent} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Trésor</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Your private circle for{'\n'}luxury collections.
        </Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Get Started"
          onPress={() => router.push('/(auth)/phone-otp')}
        />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Invitation only · Join your circle
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.largeTitle,
    fontSize: 40,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  tagline: {
    ...typography.body,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  footerText: {
    ...typography.footnote,
    textAlign: 'center',
  },
});
