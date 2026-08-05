/**
 * Invite Code screen — input field for invite code.
 * On validation, shows circle preview (name + member avatars).
 * Navigates to phone-otp on success.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { validateInviteCode } from '@/lib/invite';
import { hapticSuccess, hapticError } from '@/lib/haptics';
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
    router.push('/(auth)/phone-otp');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.body}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Enter the invite code from your circle host to join.
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: error ? colors.error : colors.border,
              },
            ]}
            placeholder="e.g. TRESOR"
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
          />

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}

          {/* Circle preview after validation */}
          {validation?.valid && validation.circle && (
            <View style={[styles.previewCard, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
                You're joining
              </Text>
              <Text style={[styles.previewName, { color: colors.textPrimary }]}>
                {validation.circle.name}
              </Text>
              <View style={styles.memberRow}>
                {validation.circle.members.map((member, i) => (
                  <View
                    key={member.id}
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.surface, marginLeft: i > 0 ? -12 : 0 },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: colors.accent }]}>
                      {member.full_name.charAt(0)}
                    </Text>
                  </View>
                ))}
                <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                  {validation.circle.members.length} members
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={validation?.valid ? 'Continue' : 'Join Circle'}
            loading={loading}
            disabled={!code.trim()}
            onPress={validation?.valid ? handleContinue : handleValidate}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingTop: spacing.xl },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  input: {
    ...typography.title3,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
    letterSpacing: 2,
  },
  errorText: {
    ...typography.footnote,
    marginTop: spacing.sm,
  },
  previewCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  previewLabel: {
    ...typography.caption1,
    marginBottom: 4,
  },
  previewName: {
    ...typography.title2,
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarText: {
    ...typography.headline,
    fontSize: 15,
  },
  memberCount: {
    ...typography.footnote,
    marginLeft: spacing.md,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
