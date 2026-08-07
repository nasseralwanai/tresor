/**
 * CustodyTransfer — confirmation bottom sheet for requesting custody.
 *
 * When a co-owner taps "Request Custody" on CoOwnersPanel, this sheet
 * appears: "Request custody from [name]?" with a confirm button.
 * On confirm, calls transferCustody() from co-ownership.ts.
 *
 * Shows loading state during the API call and success/error feedback
 * with moti animations.
 *
 * Uses @expo/ui BottomSheet for display.
 * Warm Atelier styling: gold accent, Georgia headings, Jost body.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { BottomSheet } from '@expo/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import { useThemeColors, spacing, radius } from '@/theme';
import {
  hapticLight,
  hapticSuccess,
  hapticError,
} from '@/lib/haptics';
import { transferCustody } from '@/lib/co-ownership';
import type { CoOwner } from '@/types/items';

type CustodyTransferProps = {
  /** The co-owned item ID. */
  itemId: string;
  /** The current custodian (who custody is being requested from). */
  currentCustodian: CoOwner;
  /** The user ID of the person requesting custody (the authenticated user). */
  requesterUserId: string;
  /** The name of the person requesting custody (for display). */
  requesterName: string;
  /** Called when the sheet is dismissed. */
  onDismiss: () => void;
  /** Called after a successful custody request. */
  onSuccess?: () => void;
};

type Phase = 'confirm' | 'loading' | 'success' | 'error';

export function CustodyTransfer({
  itemId,
  currentCustodian,
  requesterUserId,
  requesterName: _requesterName,
  onDismiss,
  onSuccess,
}: CustodyTransferProps) {
  const colors = useThemeColors();
  const [phase, setPhase] = useState<Phase>('confirm');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleConfirm = useCallback(async () => {
    hapticLight();
    setPhase('loading');

    try {
      await transferCustody(itemId, requesterUserId);

      hapticSuccess();
      setPhase('success');
      // Auto-dismiss after showing success
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (e: any) {
      hapticError();
      setErrorMessage(
        e?.message ?? 'Could not request custody. Please try again.'
      );
      setPhase('error');
    }
  }, [itemId, requesterUserId, onSuccess]);

  const handleRetry = useCallback(() => {
    setPhase('confirm');
    setErrorMessage('');
  }, []);

  const handleDismissWithReset = useCallback(() => {
    onDismiss();
    // Reset after dismiss animation
    setTimeout(() => {
      setPhase('confirm');
      setErrorMessage('');
    }, 300);
  }, [onDismiss]);

  return (
    <BottomSheet
      isPresented={true}
      onDismiss={handleDismissWithReset}
      showDragIndicator
    >
      <View style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
        {/* Confirm phase */}
        {phase === 'confirm' && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={styles.phaseContent}
          >
            {/* Icon */}
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: 'rgba(201, 169, 97, 0.12)' },
              ]}
            >
              <MaterialCommunityIcons
                name="hand-coin-outline"
                size={32}
                color={colors.gold}
              />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Request Custody
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Request custody from{' '}
              <Text style={{ fontWeight: '500', color: colors.textPrimary }}>
                {currentCustodian.display_name}
              </Text>
              ? They will need to approve and hand off the item.
            </Text>

            {/* Custodian info */}
            <View
              style={[
                styles.custodianInfo,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <MaterialCommunityIcons
                name="account-circle-outline"
                size={16}
                color={colors.gold}
              />
              <Text
                style={[styles.custodianInfoText, { color: colors.textPrimary }]}
              >
                Current custodian: {currentCustodian.display_name}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleDismissWithReset}
                activeOpacity={0.85}
                style={[
                  styles.cancelBtn,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Text
                  style={[styles.cancelBtnText, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                activeOpacity={0.85}
                style={[styles.confirmBtn, { backgroundColor: colors.gold }]}
              >
                <Text style={styles.confirmBtnText}>Request</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        )}

        {/* Loading phase */}
        {phase === 'loading' && (
          <View style={styles.phaseContent}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: 'rgba(201, 169, 97, 0.12)' },
              ]}
            >
              <ActivityIndicator color={colors.gold} size="large" />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Sending Request
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Requesting custody from {currentCustodian.display_name}...
            </Text>
          </View>
        )}

        {/* Success phase */}
        {phase === 'success' && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            style={styles.phaseContent}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: 'rgba(48, 164, 108, 0.12)' },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={32}
                color={colors.success}
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Request Sent
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Your custody request has been sent to{' '}
              {currentCustodian.display_name}. You will be notified when they
              respond.
            </Text>
          </MotiView>
        )}

        {/* Error phase */}
        {phase === 'error' && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={styles.phaseContent}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: 'rgba(229, 72, 77, 0.12)' },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={32}
                color={colors.error}
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Request Failed
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {errorMessage}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleDismissWithReset}
                activeOpacity={0.85}
                style={[
                  styles.cancelBtn,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Text
                  style={[styles.cancelBtnText, { color: colors.textSecondary }]}
                >
                  Dismiss
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRetry}
                activeOpacity={0.85}
                style={[styles.confirmBtn, { backgroundColor: colors.gold }]}
              >
                <Text style={styles.confirmBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  phaseContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '500',
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  custodianInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    alignSelf: 'stretch',
  },
  custodianInfoText: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Jost',
    fontSize: 15,
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Jost',
    fontSize: 15,
    fontWeight: '600',
    color: '#0A0A0B',
  },
});
