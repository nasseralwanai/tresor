/**
 * Active Borrow Screen — shows "Item is with [person]" + Mark Returned + Nudge buttons.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getMyActiveBorrows, markReturned, nudgeBorrower, getCurrentUser } from '@/lib/mockApi';
import { formatDate, formatRelativeTime } from '@/lib/format';
import type { BorrowTransaction } from '@/types/items';

export default function ActiveBorrowScreen() {
  const colors = useThemeColors();
  const [borrows, setBorrows] = useState<BorrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useMemo(() => getCurrentUser(), []);

  const loadData = useCallback(async () => {
    const data = await getMyActiveBorrows();
    setBorrows(data);
    setLoading(false);
  }, []);

  useMemo(() => {
    loadData();
  }, []);

  const handleMarkReturned = async (borrowId: string) => {
    hapticSuccess();
    await markReturned(borrowId);
    loadData();
  };

  const handleNudge = (borrowId: string) => {
    hapticLight();
    Alert.alert('Nudge Sent', 'A gentle reminder has been sent.', [{ text: 'OK' }]);
    nudgeBorrower(borrowId);
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
            const isLender = borrow.lender_id === currentUser.id;
            const otherPerson = isLender ? borrow.borrower_name : borrow.lender_name;

            return (
              <Card key={borrow.id} style={styles.borrowCard}>
                {/* Status badge */}
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(201,169,97,0.10)' }]}>
                    <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.statusText, { color: colors.accent }]}>
                      {isLender ? 'Lent Out' : 'Borrowing'}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                    {formatRelativeTime(borrow.borrowed_at ?? borrow.requested_at)}
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
                    Since {formatDate(borrow.borrowed_at ?? borrow.requested_at)}
                  </Text>
                </View>

                {/* Note */}
                {borrow.borrower_note && (
                  <View style={[styles.noteBox, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>NOTE</Text>
                    <Text style={[styles.noteText, { color: colors.textPrimary }]}>
                      "{borrow.borrower_note}"
                    </Text>
                  </View>
                )}

                {/* Actions */}
                {isLender ? (
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
                  />
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
