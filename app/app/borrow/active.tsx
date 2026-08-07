/**
 * Active Borrow Screen — shows borrow transactions across their full lifecycle.
 *
 * Statuses handled:
 *   requested        → lender sees Approve/Decline; borrower sees 'Awaiting Approval'
 *   active           → lender can Nudge; borrower can Mark Returned
 *   returned_pending → borrower confirms receipt; lender waits for confirmation
 *
 * Flow: requested → active → returned_pending → completed
 *       (or declined / cancelled at any point)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import {
  getActiveBorrows,
  acceptBorrow,
  declineBorrow,
  markReturned,
  confirmReceived,
} from '@/lib/borrow';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import type { BorrowTransactionEnriched } from '@/lib/borrow';

export default function ActiveBorrowScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [borrows, setBorrows] = useState<BorrowTransactionEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track which transaction is currently being mutated, so its action buttons
  // can show an ActivityIndicator while the request is in flight.
  const [pendingAction, setPendingAction] = useState<{ id: string; action: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setError(null);
      const data = await getActiveBorrows(user.id);
      setBorrows(data);
    } catch (e: any) {
      console.error('[active-borrows] loadData error:', e);
      setError(e?.message ?? 'Something went wrong. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isBusy = (borrowId: string, action: string) =>
    pendingAction?.id === borrowId && pendingAction?.action === action;

  const handleApprove = async (borrowId: string) => {
    setPendingAction({ id: borrowId, action: 'approve' });
    try {
      await acceptBorrow(borrowId);
      hapticSuccess();
      loadData();
    } catch (e: any) {
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not approve the request.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDecline = async (borrowId: string) => {
    setPendingAction({ id: borrowId, action: 'decline' });
    try {
      await declineBorrow(borrowId);
      hapticSuccess();
      loadData();
    } catch (e: any) {
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not decline the request.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleMarkReturned = async (borrowId: string) => {
    setPendingAction({ id: borrowId, action: 'markReturned' });
    try {
      await markReturned(borrowId);
      hapticSuccess();
      loadData();
    } catch (e: any) {
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not mark as returned.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleConfirmReceived = async (borrowId: string) => {
    setPendingAction({ id: borrowId, action: 'confirmReceived' });
    try {
      await confirmReceived(borrowId);
      hapticSuccess();
      loadData();
    } catch (e: any) {
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not confirm receipt.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleNudge = async (_borrowId: string) => {
    hapticLight();
    Alert.alert('Coming Soon', 'Push notifications for nudges will be available in a future update.', [{ text: 'OK' }]);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Active Borrows' }} />
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </>
    );
  }

  if (error && !loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Active Borrows' }} />
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md }}>
            <Text style={{ color: colors.accent }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (borrows.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Active Borrows' }} />
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No active borrows
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Items you're borrowing or lending will appear here
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Active Borrows' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {borrows.map((borrow) => {
            const isLender = borrow.lender_id === user?.id;
            const otherPerson = isLender ? borrow.borrower_name : borrow.lender_name;
            const status = borrow.status;

            // Choose the badge label based on the transaction status.
            let badgeLabel: string;
            if (status === 'requested') {
              badgeLabel = 'Pending Request';
            } else if (status === 'returned_pending') {
              badgeLabel = 'Return Pending';
            } else {
              // 'active' and 'approved' — role-based label, unchanged from before.
              badgeLabel = isLender ? 'Lent Out' : 'Borrowing';
            }
            const badgeColor = colors.accent;

            // Relative timestamp — fall back to requested_at when not yet borrowed.
            const timestamp = borrow.borrowed_at ?? borrow.requested_at;

            return (
              <Card key={borrow.id} style={styles.borrowCard}>
                {/* Status badge */}
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(201,169,97,0.10)' }]}>
                    <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />
                    <Text style={[styles.statusText, { color: badgeColor }]}>
                      {badgeLabel}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    {formatRelativeTime(timestamp)}
                  </Text>
                </View>

                {/* Item info */}
                <View style={styles.itemRow}>
                  <ItemPhotoPlaceholder letter={borrow.item_brand} size={56} style={styles.itemPhoto} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemBrand, { color: colors.accent }]}>
                      {borrow.item_brand.toUpperCase()}
                    </Text>
                    <Text style={[styles.itemModel, { color: colors.textPrimary }]} numberOfLines={1}>
                      {borrow.item_model || '—'}
                    </Text>
                  </View>
                </View>

                {/* Person info */}
                <View style={[styles.personRow, { backgroundColor: colors.surfaceElevated }]}>
                  <Avatar name={otherPerson} size="md" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personLabel, { color: colors.textSecondary }]}>
                      {isLender ? 'Item is with' : 'Borrowing from'}
                    </Text>
                    <Text style={[styles.personName, { color: colors.textPrimary }]}>
                      {otherPerson}
                    </Text>
                  </View>
                  <Text style={[styles.sinceDate, { color: colors.textSecondary }]}>
                    Since {formatDate(timestamp)}
                  </Text>
                </View>

                {/* Note */}
                {borrow.borrower_note && (
                  <View style={[styles.noteBox, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>NOTE</Text>
                    <Text style={[styles.noteText, { color: colors.textPrimary }]}>
                      &ldquo;{borrow.borrower_note}&rdquo;
                    </Text>
                  </View>
                )}

                {/* Actions — driven by status + role */}
                {status === 'requested' && (
                  isLender ? (
                    <View style={styles.actionRow}>
                      <PrimaryButton
                        label="Approve"
                        onPress={() => handleApprove(borrow.id)}
                        loading={isBusy(borrow.id, 'approve')}
                        disabled={pendingAction?.id === borrow.id}
                        style={styles.actionButton}
                      />
                      <DeclineButton
                        label="Decline"
                        onPress={() => handleDecline(borrow.id)}
                        loading={isBusy(borrow.id, 'decline')}
                        disabled={pendingAction?.id === borrow.id}
                        colors={colors}
                      />
                    </View>
                  ) : (
                    <View style={[styles.infoBox, { backgroundColor: colors.surfaceElevated }]}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Awaiting approval from {borrow.lender_name}
                      </Text>
                    </View>
                  )
                )}

                {status === 'active' && (
                  isLender ? (
                    <TouchableOpacity
                      onPress={() => handleNudge(borrow.id)}
                      style={[styles.nudgeBtn, { borderColor: colors.border }]}
                    >
                      <MaterialCommunityIcons name="bell-outline" size={16} color={colors.textPrimary} />
                      <Text style={[styles.nudgeBtnText, { color: colors.textPrimary }]}>
                        Nudge {borrow.borrower_name}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <PrimaryButton
                      label="Mark Returned"
                      onPress={() => handleMarkReturned(borrow.id)}
                      loading={isBusy(borrow.id, 'markReturned')}
                      disabled={pendingAction?.id === borrow.id}
                    />
                  )
                )}

                {status === 'returned_pending' && (
                  isLender ? (
                    <View style={[styles.infoBox, { backgroundColor: colors.surfaceElevated }]}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Waiting for {borrow.borrower_name} to confirm receipt
                      </Text>
                    </View>
                  ) : (
                    <PrimaryButton
                      label="Confirm Received"
                      onPress={() => handleConfirmReceived(borrow.id)}
                      loading={isBusy(borrow.id, 'confirmReceived')}
                      disabled={pendingAction?.id === borrow.id}
                    />
                  )
                )}
              </Card>
            );
          })}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </View>
    </>
  );
}

/**
 * DeclineButton — secondary, destructive-styled action paired with the Approve button.
 * Kept inline so the borrow screen remains self-contained; uses the warm Atelier
 * palette (error red text on a hairline border) rather than a full red fill.
 */
function DeclineButton({
  label,
  onPress,
  loading,
  disabled,
  colors,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.declineBtn,
        { borderColor: colors.border, opacity: isDisabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.error} />
      ) : (
        <Text style={[styles.declineBtnText, { color: colors.error }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg + 6,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  borrowCard: {
    gap: spacing.md - 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption2,
    fontSize: 11,
    fontWeight: '500',
  },
  timeText: {
    ...typography.caption1,
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
  },
  itemPhoto: {
    borderRadius: radius.sm,
  },
  itemBrand: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
  },
  itemModel: {
    ...typography.bodyEmphasized,
    fontSize: 15,
    marginTop: 2,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    borderRadius: radius.md,
    padding: spacing.md - 2,
  },
  personLabel: {
    ...typography.caption1,
    fontSize: 11,
  },
  personName: {
    ...typography.bodyEmphasized,
    fontSize: 15,
    marginTop: 1,
  },
  sinceDate: {
    ...typography.caption2,
    fontSize: 10,
  },
  noteBox: {
    borderRadius: radius.sm,
    padding: spacing.md - 2,
  },
  noteLabel: {
    ...typography.caption2,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  noteText: {
    ...typography.body,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  declineBtn: {
    flex: 1,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    ...typography.headline,
    fontSize: 17,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md - 2,
  },
  infoText: {
    ...typography.body,
    fontSize: 14,
    flex: 1,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 0.5,
  },
  nudgeBtnText: {
    ...typography.bodyEmphasized,
    fontSize: 14,
  },
  emptyText: {
    ...typography.title3,
    marginTop: spacing.md,
  },
  emptySub: {
    ...typography.body,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
