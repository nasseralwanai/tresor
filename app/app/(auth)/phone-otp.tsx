/**
 * Phone OTP authentication screen — luxury two-step phone-first auth.
 *
 * Step 1 (Phone Input):
 *   - Fixed +971 prefix (UAE-only, non-editable)
 *   - UAE flag as inline SVG (red/green/white/black — no emoji)
 *   - Single input for 9-digit local number, masked 5X XXX XXXX
 *   - Segmented control [SMS] [WhatsApp] with SVG icons
 *   - "Use email instead" link → email-signin
 *
 * Step 2 (OTP Verify):
 *   - 6 individual digit boxes (36px × 44px per research)
 *   - Auto-focus progression (active box: gold border + glow)
 *   - Auto-submit when all 6 digits entered
 *   - "Resend code" with 30s countdown
 *   - "Change number" → back to step 1
 *   - expo-haptics on each digit + error/success
 *   - Error state: red border + shake animation
 *   - Success state: gold checkmark
 *
 * Per Muaath's onboarding research (§2, §3, §4, §6).
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
import { MotiView } from 'moti';
import Svg, { Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, serifFont, bodyFont, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

type Step = 'phone' | 'otp';
type Channel = 'sms' | 'whatsapp';

const UAE_PHONE_LENGTH = 9;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

// ── UAE Flag SVG (20×14) — vertical red stripe + green/white/black bands ──
function UAEFlag() {
  return (
    <Svg width={20} height={14} viewBox="0 0 20 14">
      {/* Vertical red stripe on hoist side (1/4 width) */}
      <Rect x={0} y={0} width={5} height={14} fill="#CE1126" />
      {/* Green band (top) */}
      <Rect x={5} y={0} width={15} height={4.67} fill="#00732F" />
      {/* White band (middle) */}
      <Rect x={5} y={4.67} width={15} height={4.66} fill="#FFFFFF" />
      {/* Black band (bottom) */}
      <Rect x={5} y={9.33} width={15} height={4.67} fill="#000000" />
    </Svg>
  );
}

// ── Speech bubble SVG icon (for SMS segment) ──
function SmsIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── WhatsApp logo SVG path (brand recognition, not emoji) ──
function WhatsAppIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.88 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.84.98h.01a7.94 7.94 0 0 0 7.94-7.93 7.86 7.86 0 0 0-2.39-5.63zM12.05 18.5h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.55 6.55 0 0 1-1-3.48 6.6 6.6 0 0 1 6.6-6.58 6.53 6.53 0 0 1 4.65 1.93 6.53 6.53 0 0 1 1.93 4.66 6.6 6.6 0 0 1-6.58 6.58zm3.62-4.93c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.45.1-.13.2-.51.64-.63.77-.12.13-.23.15-.43.05-.2-.1-.84-.31-1.6-.99-.59-.53-.99-1.18-1.11-1.38-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.45-1.08-.62-1.48-.16-.39-.33-.34-.45-.34l-.38-.01c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.66 0 .98.71 1.92.81 2.05.1.13 1.4 2.13 3.38 2.99.47.2.84.33 1.13.42.47.15.9.13 1.24.08.38-.06 1.17-.48 1.34-.94.17-.46.17-.86.12-.94-.05-.08-.18-.13-.38-.23z"
        fill={color}
      />
    </Svg>
  );
}

/** Full E.164 phone number from the local 9-digit part. */
function buildE164(localDigits: string): string {
  return `+971${localDigits}`;
}

/** Formatted phone display for OTP context text: +971 5X XXX XXXX */
function formatPhone(localDigits: string): string {
  if (localDigits.length <= 2) return `+971 ${localDigits}`;
  if (localDigits.length <= 5) return `+971 ${localDigits.slice(0, 2)} ${localDigits.slice(2)}`;
  return `+971 ${localDigits.slice(0, 2)} ${localDigits.slice(2, 5)} ${localDigits.slice(5)}`;
}

/** Mask the local number as user types: 5X XXX XXXX */
function maskPhoneInput(digits: string): string {
  const d = digits.slice(0, UAE_PHONE_LENGTH);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export default function PhoneOtpScreen() {
  const colors = useThemeColors();
  const { signInWithPhone, verifyOtp } = useAuth();
  const { circleId } = useLocalSearchParams<{ circleId?: string }>();

  const [step, setStep] = useState<Step>('phone');
  const [channel, setChannel] = useState<Channel>('sms');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);
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
    if (!phoneLocal.startsWith('5')) {
      hapticError();
      setError('UAE mobile numbers start with 5.');
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
      setOtpError(false);
      try {
        const ok = await verifyOtp(buildE164(phoneLocal), code);
        if (ok) {
          hapticSuccess();
          setOtpSuccess(true);
          // Smooth transition before navigating
          setTimeout(() => {
            router.replace({
              pathname: '/(auth)/invite-code',
              params: circleId ? { circleId } : {},
            });
          }, 600);
        } else {
          hapticError();
          setOtpError(true);
          setError('Verification failed. Check your code and try again.');
        }
      } catch (e: any) {
        hapticError();
        setOtpError(true);
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

  handleVerifyOtpRef.current = handleVerifyOtp;

  // ---- OTP digit handling with auto-advance + haptics ----
  const handleOtpChange = (index: number, value: string) => {
    // Support paste of full code
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (pastedDigits.length > 1) {
        hapticLight();
        const next = Array(OTP_LENGTH).fill('');
        for (let i = 0; i < pastedDigits.length; i++) {
          next[i] = pastedDigits[i];
        }
        setOtpDigits(next);
        setError(null);
        setOtpError(false);
        const lastIndex = Math.min(pastedDigits.length, OTP_LENGTH) - 1;
        setActiveOtpIndex(Math.min(lastIndex + 1, OTP_LENGTH - 1));
        if (pastedDigits.length === OTP_LENGTH) {
          Keyboard.dismiss();
          setTimeout(() => handleVerifyOtpRef.current(pastedDigits), 100);
        } else {
          otpRefs.current[Math.min(pastedDigits.length, OTP_LENGTH - 1)]?.focus();
        }
        return;
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    hapticLight();

    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setError(null);
    setOtpError(false);

    if (digit && index < OTP_LENGTH - 1) {
      setActiveOtpIndex(index + 1);
      otpRefs.current[index + 1]?.focus();
    } else if (digit && index === OTP_LENGTH - 1) {
      setActiveOtpIndex(index);
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
      setActiveOtpIndex(index - 1);
      otpRefs.current[index - 1]?.focus();
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
    }
  };

  const handleOtpFocus = (index: number) => {
    setActiveOtpIndex(index);
  };

  // ---- Resend OTP ----
  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    setError(null);
    setOtpError(false);
    try {
      await signInWithPhone(buildE164(phoneLocal));
      hapticSuccess();
      setResendSeconds(RESEND_COOLDOWN);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setActiveOtpIndex(0);
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
    setOtpError(false);
    setOtpSuccess(false);
    setResendSeconds(0);
  };

  // ================================================================
  // STEP 1: Phone number input
  // ================================================================
  if (step === 'phone') {
    const phoneValid = phoneLocal.length === UAE_PHONE_LENGTH && phoneLocal.startsWith('5');
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
                Your Number
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                We'll send a verification code to confirm it's you.
              </Text>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 120 }}
            >
              {/* Phone input with UAE flag + fixed prefix */}
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
                  <UAEFlag />
                  <Text style={[styles.prefixText, { color: colors.textPrimary }]}>
                    +971
                  </Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: colors.textPrimary }]}
                  placeholder="5X XXX XXXX"
                  placeholderTextColor={colors.textSecondary}
                  value={maskPhoneInput(phoneLocal)}
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

            {/* Segmented control: SMS | WhatsApp */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 240 }}
            >
              <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    channel === 'sms' && [
                      styles.segmentActive,
                      { backgroundColor: colors.surfaceElevated },
                    ],
                  ]}
                  onPress={() => {
                    hapticLight();
                    setChannel('sms');
                  }}
                  activeOpacity={0.8}
                >
                  <SmsIcon
                    color={channel === 'sms' ? colors.accent : colors.textSecondary}
                    size={15}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: channel === 'sms' ? colors.accent : colors.textSecondary,
                      },
                    ]}
                  >
                    SMS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segment,
                    channel === 'whatsapp' && [
                      styles.segmentActive,
                      { backgroundColor: colors.surfaceElevated },
                    ],
                  ]}
                  onPress={() => {
                    hapticLight();
                    setChannel('whatsapp');
                  }}
                  activeOpacity={0.8}
                >
                  <WhatsAppIcon
                    color={channel === 'whatsapp' ? colors.accent : colors.textSecondary}
                    size={15}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          channel === 'whatsapp' ? colors.accent : colors.textSecondary,
                      },
                    ]}
                  >
                    WhatsApp
                  </Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          </View>

          <View style={styles.footer}>
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 80, delay: 360 }}
              style={styles.footerInner}
            >
              <PrimaryButton
                label="Send Code"
                loading={loading}
                disabled={!phoneValid}
                onPress={handleSendOtp}
              />
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  router.push({
                    pathname: '/(auth)/email-signin',
                    params: circleId ? { circleId } : {},
                  });
                }}
                style={styles.emailLink}
              >
                <Text style={[styles.emailLinkText, { color: colors.textSecondary }]}>
                  Use email instead
                </Text>
              </TouchableOpacity>
            </MotiView>
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
            <Text style={[styles.backText, { color: colors.accent }]}>Change number</Text>
          </TouchableOpacity>

          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Enter Code
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Code sent to {formatPhone(phoneLocal)}
            </Text>
          </MotiView>

          {/* OTP boxes — 36px × 44px per research */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 120 }}
            style={styles.otpRow}
          >
            {otpDigits.map((digit, i) => {
              const isActive = activeOtpIndex === i && !otpSuccess;
              const isError = otpError;
              const isFilled = digit !== '';

              return (
                <MotiView
                  key={i}
                  animate={
                    otpError
                      ? {
                          translateX: [0, -6, 6, -4, 4, 0],
                        }
                      : { translateX: 0 }
                  }
                  transition={
                    otpError
                      ? { duration: 400, loop: false }
                      : { duration: 0 }
                  }
                  style={styles.otpBoxWrap}
                >
                  <TextInput
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    style={[
                      styles.otpBox,
                      {
                        backgroundColor: colors.surface,
                        color: colors.textPrimary,
                        borderColor: otpSuccess
                          ? colors.success
                          : isError
                            ? colors.error
                            : isActive
                              ? colors.accent
                              : isFilled
                                ? colors.gold
                                : colors.border,
                      },
                    ]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(i, v)}
                    onKeyPress={(e) => handleOtpKeyPress(i, e.nativeEvent.key)}
                    onFocus={() => handleOtpFocus(i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={i === 0}
                    editable={!otpSuccess}
                  />
                  {/* Gold glow ring for active box */}
                  {isActive && !otpError && !otpSuccess && (
                    <View
                      style={[styles.otpGlow, { borderColor: colors.gold }]}
                      pointerEvents="none"
                    />
                  )}
                </MotiView>
              );
            })}
          </MotiView>

          {/* Success checkmark */}
            {otpSuccess && (
              <MotiView
                from={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 120 }}
                style={styles.successWrap}
              >
                <View style={[styles.successCircle, { borderColor: colors.gold }]}>
                  <MaterialCommunityIcons name="check" size={28} color={colors.gold} />
                </View>
                <Text style={[styles.successText, { color: colors.textPrimary }]}>
                  Verified
                </Text>
              </MotiView>
            )}

          {error && !otpSuccess && (
            <Text style={[styles.errorText, { color: colors.error, textAlign: 'center' }]}>
              {error}
            </Text>
          )}

          {/* Resend + channel indicator */}
          {!otpSuccess && (
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
          )}

          {/* Channel indicator */}
          {!otpSuccess && (
            <View style={styles.channelIndicator}>
              {channel === 'whatsapp' ? (
                <WhatsAppIcon color={colors.textSecondary} size={12} />
              ) : (
                <SmsIcon color={colors.textSecondary} size={12} />
              )}
              <Text style={[styles.channelText, { color: colors.textSecondary }]}>
                via {channel === 'sms' ? 'SMS' : 'WhatsApp'}
              </Text>
            </View>
          )}
        </View>

        {!otpSuccess && (
          <View style={styles.footer}>
            <PrimaryButton
              label="Verify"
              loading={loading}
              disabled={!otpComplete}
              onPress={() => handleVerifyOtp()}
            />
          </View>
        )}
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
    marginBottom: spacing.xl,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(150,150,150,0.15)',
  },
  prefixText: {
    fontFamily: bodyFont,
    fontSize: 17,
    fontWeight: '500',
  },
  phoneInput: {
    fontFamily: bodyFont,
    fontSize: 20,
    fontWeight: '400',
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    letterSpacing: 1.5,
  },
  errorText: {
    fontFamily: bodyFont,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  // Segmented control
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.1)',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.sm,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontFamily: bodyFont,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // OTP
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: spacing.lg,
  },
  otpBoxWrap: {
    position: 'relative',
  },
  otpBox: {
    fontFamily: serifFont,
    fontSize: 20,
    width: 36,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  otpGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    opacity: 0.3,
  },
  // Success
  successWrap: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  successCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successText: {
    fontFamily: serifFont,
    fontSize: 18,
    letterSpacing: 1,
  },
  // Resend + channel
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    fontFamily: bodyFont,
    fontSize: 13,
  },
  resendActive: {
    fontFamily: bodyFont,
    fontSize: 13,
    fontWeight: '500',
  },
  channelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  channelText: {
    fontFamily: bodyFont,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  backText: {
    fontFamily: bodyFont,
    fontSize: 14,
  },
  backButton: {
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
  footerInner: {
    gap: spacing.md,
  },
  emailLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  emailLinkText: {
    fontFamily: bodyFont,
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
