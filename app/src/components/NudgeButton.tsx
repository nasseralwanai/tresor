/**
 * NudgeButton — gentle reminder button for active borrows.
 *
 * Shows a "Nudge" button with an optional badge (nudge_count).
 * On press, calls the nudge_borrower RPC, provides haptic feedback,
 * and surfaces rate-limit messages when the server rejects the nudge.
 *
 * Warm Atelier styling: gold accent, hairline border, Jost body.
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import { useThemeColors, spacing, radius } from '@/theme';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import {
  nudgeBorrower,
  getNudgeStatus,
  nudgeErrorMessage,
  type NudgeErrorCode,
} from '@/lib/nudge';

type NudgeButtonProps = {
  /** The borrow_transactions.id for the active borrow. */
  borrowId: string;
  /** Optional borrower name for display in status messages. */
  borrowerName?: string;
  /** Compact mode for inline list cards (smaller button). */
  compact?: boolean;
  /** Style override for the button container. */
  style?: typeof styles.button;
};

function NudgeButtonInner({
  borrowId,
  borrowerName,
  compact = false,
  style,
}: NudgeButtonProps) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch nudge status on mount
  const loadStatus = useCallback(async () => {
    try {
      const status = await getNudgeStatus(borrowId);
      setNudgeCount(status.nudge_count);
    } catch (e) {
      // Non-blocking — the button still works without the badge
      console.warn('[NudgeButton] Failed to load nudge status:', e);
    } finally {
      setStatusLoading(false);
    }
  }, [borrowId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const handleNudge = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    hapticLight();

    try {
      const result = await nudgeBorrower(borrowId);

      if (result.success) {
        hapticSuccess();
        setNudgeCount((prev) => prev + 1);
        setMessageType('success');
        setMessage(
          borrowerName
            ? `Nudge sent to ${borrowerName}`
            : 'Nudge sent'
        );
        // Clear success message after a few seconds
        messageTimerRef.current = setTimeout(() => setMessage(null), 3500);
      } else {
        hapticError();
        setMessageType('error');
        setMessage(nudgeErrorMessage(result.error as NudgeErrorCode));
      }
    } catch (e: any) {
      hapticError();
      setMessageType('error');
      setMessage(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [borrowId, loading, borrowerName]);

  const showBadge = nudgeCount > 0 && !statusLoading;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleNudge}
        disabled={loading}
        activeOpacity={0.85}
        style={[
          compact ? styles.compactButton : styles.button,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.gold} />
        ) : (
          <>
            <MaterialCommunityIcons
              name="bell-outline"
              size={compact ? 12 : 16}
              color={colors.gold}
            />
            <Text
              style={[
                compact ? styles.compactText : styles.text,
                { color: colors.textPrimary },
              ]}
            >
              Nudge
            </Text>
            {showBadge && (
              <MotiView
                from={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                style={[styles.badge, { backgroundColor: colors.gold }]}
              >
                <Text style={styles.badgeText}>{nudgeCount}</Text>
              </MotiView>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Inline message (success or rate-limit error) */}
      {message && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.messageWrap}
        >
          <View
            style={[
              styles.messageRow,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: messageType === 'success' ? colors.success : colors.error,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={messageType === 'success' ? 'check-circle-outline' : 'alert-circle-outline'}
              size={14}
              color={messageType === 'success' ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.messageText,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              {message}
            </Text>
          </View>
        </MotiView>
      )}
    </View>
  );
}

export const NudgeButton = memo(NudgeButtonInner);

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '500',
  },
  compactText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  badgeText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageWrap: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 320,
  },
  messageText: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '300',
    flexShrink: 1,
  },
});
