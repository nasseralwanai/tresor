/**
 * Invite Code screen — luxury invite code entry (AFTER auth).
 *
 * Per Muaath's research: invite code moved after authentication to fix
 * the RLS bug where anon users can't validate invite codes.
 *
 * - Large editorial input field with gold underline
 * - Serif italic placeholder in empty state
 * - Circle preview card appears on validation (name, description, members)
 * - "Join Circle" button with moti press animation
 * - moti staggered entrance
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { useThemeColors, serifFont, bodyFont, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { validateInviteCode } from '@/lib/invite';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import type { InviteCodeValidation } from '@/types';

export default function InviteCodeScreen() {
  const colors = useThemeColors();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<InviteCodeValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await validateInviteCode(code);
      setValidation(result);
      if (result.valid) {
        hapticSuccess();
      } else {
        hapticError();
        setError(result.error ?? 'Invalid code');
      }
    } catch {
      hapticError();
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    hapticLight();
    if (validation?.valid && validation.circle) {
      router.push({
        pathname: '/(auth)/profile-setup',
        params: { circleId: validation.circle.id },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.body}>
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Join Your Circle
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Enter the invite code from your circle host.
            </Text>
          </MotiView>

          {/* Editorial input with gold underline */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 120 }}
          >
            <View style={styles.inputWrap}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    borderBottomColor: error
                      ? colors.error
                      : validation?.valid
                        ? colors.gold
                        : code
                          ? colors.accent
                          : colors.border,
                  },
                ]}
                placeholder="Enter your invite code"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase());
                  setError(null);
                  setValidation(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleValidate}
                textAlign="center"
              />
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}
          </MotiView>

          {/* Circle preview card — appears on validation */}
          <AnimatePresence>
            {validation?.valid && validation.circle && (
              <MotiView
                from={{ opacity: 0, translateY: 24, scale: 0.96 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 18, stiffness: 120 }}
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                  You're joining
                </Text>
                <Text style={[styles.previewName, { color: colors.textPrimary }]}>
                  {validation.circle.name}
                </Text>
                {validation.circle.description && (
                  <Text
                    style={[styles.previewDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {validation.circle.description}
                  </Text>
                )}
                <View style={styles.memberRow}>
                  {validation.circle.members.slice(0, 5).map((member, i) => (
                    <View
                      key={member.id}
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.surfaceElevated,
                          marginLeft: i > 0 ? -10 : 0,
                        },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: colors.accent }]}>
                        {(member.display_name ?? '?').charAt(0)}
                      </Text>
                    </View>
                  ))}
                  <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                    {validation.circle.members.length}{' '}
                    {validation.circle.members.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
              </MotiView>
            )}
          </AnimatePresence>
        </View>

        <View style={styles.footer}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 80, delay: 240 }}
          >
            <PrimaryButton
              label={validation?.valid ? 'Join Circle' : 'Validate Code'}
              loading={loading}
              disabled={!code.trim()}
              onPress={validation?.valid ? handleContinue : handleValidate}
            />
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingTop: spacing.xl },
  title: {
    fontFamily: serifFont,
    fontSize: 30,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: bodyFont,
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  inputWrap: {
    marginTop: spacing.md,
  },
  input: {
    fontFamily: serifFont,
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: 4,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: bodyFont,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  // Circle preview card
  previewCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewLabel: {
    fontFamily: bodyFont,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewName: {
    fontFamily: serifFont,
    fontSize: 22,
    fontWeight: '400',
    marginBottom: spacing.xs,
  },
  previewDesc: {
    fontFamily: bodyFont,
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarText: {
    fontFamily: serifFont,
    fontSize: 14,
    fontWeight: '500',
  },
  memberCount: {
    fontFamily: bodyFont,
    fontSize: 13,
    marginLeft: spacing.md,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
