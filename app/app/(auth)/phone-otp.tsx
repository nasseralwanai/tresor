/**
 * Phone OTP authentication screen — phone-first auth for UAE market.
 *
 * Two-step flow:
 *   Step 1: Enter UAE mobile number (+971, 9 digits) → signInWithPhone(phone)
 *   Step 2: Enter 6-digit OTP → verifyOtp(phone, token)
 *
 * On success, AuthContext persists the session via onAuthStateChange and the
 * root layout redirects to /(tabs). New users continue to profile-setup.
 * Email/password fallback is available via a link at the bottom.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

type Step = 'phone' | 'otp';

const UAE_PHONE_LENGTH = 9;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

/** Full E.164 phone number from the local 9-digit part. */
function buildE164(localDigits: string): string {
  return `+971${localDigits}`;
}

/** Masked display for the OTP step. */
function maskPhone(localDigits: string): string {
  const last4 = localDigits.slice(-4);
  return `+971 ••• ${last4}`;
}

export default function PhoneOtpScreen() {
  const colors = useThemeColors();
  const { signInWithPhone, verifyOtp } = useAuth();
  const { circleId } = useLocalSearchParams<{ circleId?: string }>();

  const [step, setStep] = useState<Step>('phone');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // Ref so auto-submit (triggered from handleOtpChange) calls the latest closure.
  const handleVerifyOtpRef = useRef<(code?: string) => void>(() => {});

  // ---- Resend countdown ----
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSeconds]);

  // ---- Step 1: send OTP ----
  const handleSendOtp = async () => {
    if (phoneLocal.length !== UAE_PHONE_LENGTH) {
      hapticError();
      setError('Enter a valid 9-digit UAE mobile number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithPhone(buildE164(phoneLocal));
      hapticSuccess();
      setStep('otp');
      setResendSeconds(RESEND_COOLDOWN);
    } catch (e: any) {
      hapticError();
      setError(e?.message ?? 'Could not send code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 2: verify OTP ----
  const handleVerifyOtp = useCallback(
    async (codeOverride?: string) => {
      const code = codeOverride ?? otpDigits.join('');
      if (code.length !== OTP_LENGTH) return;
      setLoading(true);
      setError(null);
      try {
        const ok = await verifyOtp(buildE164(phoneLocal), code);
        if (ok) {
          hapticSuccess();
          // AuthContext onAuthStateChange persists the session.
          // Root layout redirects authenticated users to /(tabs).
          // New users proceed to profile-setup.
          router.replace({
            pathname: '/(auth)/profile-setup',
            params: circleId ? { circleId } : {},
          });
        } else {
          hapticError();
          setError('Verification failed. Check your code and try again.');
        }
      } catch (e: any) {
        hapticError();
        const msg = e?.message ?? 'Verification failed.';
        if (/expir/i.test(msg)) {
          setError('Your code has expired. Request a new one.');
        } else if (/invalid/i.test(msg)) {
          setError('Incorrect code. Try again.');
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [otpDigits, phoneLocal, verifyOtp, circleId]
  );

  // Keep ref in sync each render
  handleVerifyOtpRef.current = handleVerifyOtp;

  // ---- OTP digit handling with auto-advance ----
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    hapticLight();

    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setError(null);

    // Auto-advance to next box
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === OTP_LENGTH - 1) {
      const code = next.join('');
      if (code.length === OTP_LENGTH && !code.includes('')) {
        Keyboard.dismiss();
        setTimeout(() => handleVerifyOtpRef.current(code), 100);
      }
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
    }
  };

  // ---- Resend OTP ----
  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithPhone(buildE164(phoneLocal));
      hapticSuccess();
      setResendSeconds(RESEND_COOLDOWN);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } catch (e: any) {
      hapticError();
      setError(e?.message ?? 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Back to phone step ----
  const handleBack = () => {
    hapticLight();
    setStep('phone');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setError(null);
    setResendSeconds(0);
  };

  // ================================================================
  // STEP 1: Phone number input
  // ================================================================
  if (step === 'phone') {
    const phoneValid = phoneLocal.length === UAE_PHONE_LENGTH;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inner}
        >
          <View style={styles.body}>
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500 }}
            >
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Verify Your Number
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Enter your UAE mobile number. We'll send a 6-digit code to confirm it.
              </Text>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 100 }}
            >
              <View
                style={[
                  styles.phoneRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: error ? colors.error : colors.border,
                  },
                ]}
              >
                <View style={styles.prefixBox}>
                  <MaterialCommunityIcons name="phone" size={18} color={colors.accent} />
                  <Text style={[styles.prefixText, { color: colors.textPrimary }]}>+971</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: colors.textPrimary }]}
                  placeholder="5X XXX XXXX"
                  placeholderTextColor={colors.textSecondary}
                  value={phoneLocal}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '').slice(0, UAE_PHONE_LENGTH);
                    setPhoneLocal(digits);
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={phoneValid ? handleSendOtp : undefined}
                  autoFocus
                />
              </View>

              {error && (
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              )}
            </MotiView>
          </View>

          <View style={styles.footer}>
            <PrimaryButton
              label="Send Code"
              loading={loading}
              disabled={!phoneValid}
              onPress={handleSendOtp}
            />
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(auth)/email-signin',
                  params: circleId ? { circleId } : {},
                })
              }
              style={styles.emailLink}
            >
              <Text style={[styles.emailLinkText, { color: colors.textSecondary }]}>
                Sign in with email
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ================================================================
  // STEP 2: OTP verification
  // ================================================================
  const otpComplete = otpDigits.every((d) => d !== '');
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.body}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.accent} />
          </TouchableOpacity>

          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Enter Verification Code
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              We sent a 6-digit code to {maskPhone(phoneLocal)}.
            </Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
            style={styles.otpRow}
          >
            {otpDigits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    borderColor: error ? colors.error : digit ? colors.accent : colors.border,
                  },
                ]}
                value={digit}
                onChangeText={(v) => handleOtpChange(i, v)}
                onKeyPress={(e) => handleOtpKeyPress(i, e.nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </MotiView>

          {error && (
            <Text style={[styles.errorText, { color: colors.error, textAlign: 'center' }]}>
              {error}
            </Text>
          )}

          <View style={styles.resendRow}>
            {resendSeconds > 0 ? (
              <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                Resend code in {resendSeconds}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={[styles.resendActive, { color: colors.accent }]}>
                  Resend code
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Verify"
            loading={loading}
            disabled={!otpComplete}
            onPress={() => handleVerifyOtp()}
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
  title: {
    ...typography.title1,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    height: '100%',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(150,150,150,0.2)',
  },
  prefixText: {
    ...typography.body,
    fontWeight: '600',
  },
  phoneInput: {
    ...typography.title3,
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    letterSpacing: 1,
  },
  errorText: {
    ...typography.footnote,
    marginTop: spacing.sm,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpBox: {
    ...typography.title1,
    width: 48,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    ...typography.footnote,
  },
  resendActive: {
    ...typography.footnote,
    fontWeight: '600',
  },
  backButton: {
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  emailLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  emailLinkText: {
    ...typography.footnote,
  },
});
