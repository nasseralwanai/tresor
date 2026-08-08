/**
 * CoOwnersPanel — co-owners list shown on the Item Detail screen.
 *
 * Displays each co-owner with their avatar initials, display name, and
 * ownership share percentage. The current custodian is highlighted with
 * a gold "Primary Custodian" badge. If the viewer is a co-owner but not
 * the current custodian, a "Request Custody" button appears.
 *
 * Includes a "View Ownership History" link that opens the
 * OwnershipHistory bottom sheet.
 *
 * Warm Atelier styling: gold (#C9A961) accent for custodian, Georgia
 * serif headings, Jost body text.
 */

import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { hapticLight } from '@/lib/haptics';
import { getCoOwners } from '@/lib/co-ownership';
import { OwnershipHistory } from '@/components/OwnershipHistory';
import { CustodyTransfer } from '@/components/CustodyTransfer';
import type { CoOwner } from '@/types/items';
import type { Item } from '@/types/items';

type CoOwnersPanelProps = {
  /** The co-owned item. */
  item: Item;
  /** Current authenticated user ID. */
  userId: string | null | undefined;
};

function CoOwnersPanelInner({ item, userId }: CoOwnersPanelProps) {
  const colors = useThemeColors();
  const [coOwners, setCoOwners] = useState<CoOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [custodyTarget, setCustodyTarget] = useState<CoOwner | null>(null);

  const loadCoOwners = useCallback(async () => {
    if (!item.id) return;
    try {
      setError(null);
      const owners = await getCoOwners(item.id);
      setCoOwners(owners);
    } catch (e: any) {
      console.warn('[CoOwnersPanel] Failed to load co-owners:', e);
      setError(e?.message ?? 'Could not load co-owners.');
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  useEffect(() => {
    loadCoOwners();
  }, [loadCoOwners]);

  // Determine if the current user is a co-owner (but not the custodian)
  const userIsCoOwner = useMemo(() => coOwners.some((o) => o.user_id === userId), [coOwners, userId]);
  const userIsCustodian = item.current_custodian_id === userId;

  const handleRequestCustody = useCallback((owner: CoOwner) => {
    // owner here is the *current custodian* — we pass them to the sheet
    hapticLight();
    setCustodyTarget(owner);
  }, []);

  const handleCustodyDismiss = useCallback(() => {
    setCustodyTarget(null);
  }, []);

  const handleCustodySuccess = useCallback(() => {
    setCustodyTarget(null);
    setLoading(true);
    loadCoOwners();
  }, [loadCoOwners]);

  const handleOpenHistory = useCallback(() => {
    hapticLight();
    setHistoryOpen(true);
  }, []);

  const handleDismissHistory = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.gold} size="small" />
      </View>
    );
  }

  if (error) {
    return (
      <Card style={styles.panel}>
        <Text style={[styles.panelError, { color: colors.textSecondary }]}>
          {error}
        </Text>
      </Card>
    );
  }

  if (coOwners.length === 0) {
    return null;
  }

  // The current custodian (from item.current_custodian_id, matched against co-owners)
  const custodianOwner = coOwners.find(
    (o) => o.user_id === item.current_custodian_id
  );

  return (
    <>
      <Card style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={18}
            color={colors.gold}
          />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Co-Owners
          </Text>
          <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
            {coOwners.length}
          </Text>
        </View>

        {/* Co-owner list */}
        <View style={styles.ownerList}>
          {coOwners.map((owner, index) => {
            const isCustodian = owner.user_id === item.current_custodian_id;
            const isYou = owner.user_id === userId;

            return (
              <View
                key={owner.id}
                style={[
                  styles.ownerRow,
                  index < coOwners.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Avatar */}
                <Avatar name={owner.display_name} size="md" />

                {/* Name + custodian badge */}
                <View style={styles.ownerInfo}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.ownerName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {isYou ? 'You' : owner.display_name}
                    </Text>
                    {isCustodian && (
                      <View
                        style={[
                          styles.custodianBadge,
                          { backgroundColor: 'rgba(201, 169, 97, 0.12)' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="key-variant"
                          size={9}
                          color={colors.gold}
                        />
                        <Text
                          style={[styles.custodianBadgeText, { color: colors.gold }]}
                        >
                          Primary Custodian
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[styles.ownerSub, { color: colors.textSecondary }]}
                  >
                    {owner.share_percentage.toFixed(0)}% share
                  </Text>
                </View>

                {/* Share percentage (right side) */}
                <View style={styles.shareWrap}>
                  <Text
                    style={[
                      styles.sharePercent,
                      {
                        color: isCustodian ? colors.gold : colors.textPrimary,
                      },
                    ]}
                  >
                    {owner.share_percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Request custody — only if user is a co-owner but not the custodian */}
          {userIsCoOwner && !userIsCustodian && custodianOwner && (
            <TouchableOpacity
              onPress={() => handleRequestCustody(custodianOwner)}
              activeOpacity={0.85}
              style={[
                styles.custodyBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.gold,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="hand-coin-outline"
                size={15}
                color={colors.gold}
              />
              <Text style={[styles.custodyBtnText, { color: colors.gold }]}>
                Request Custody
              </Text>
            </TouchableOpacity>
          )}

          {/* View ownership history */}
          <TouchableOpacity
            onPress={handleOpenHistory}
            activeOpacity={0.7}
            style={styles.historyLink}
          >
            <MaterialCommunityIcons
              name="history"
              size={14}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.historyLinkText, { color: colors.textSecondary }]}
            >
              View Ownership History
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Ownership History bottom sheet */}
      <OwnershipHistory
        itemId={item.id}
        isPresented={historyOpen}
        onDismiss={handleDismissHistory}
      />

      {/* Custody transfer confirmation sheet */}
        {custodyTarget && (
          <CustodyTransfer
            itemId={item.id}
            currentCustodian={custodyTarget}
            requesterUserId={userId ?? ''}
            requesterName={
              coOwners.find((o) => o.user_id === userId)?.display_name ?? 'You'
            }
            onDismiss={handleCustodyDismiss}
            onSuccess={handleCustodySuccess}
          />
        )}
    </>
  );
}

export const CoOwnersPanel = memo(CoOwnersPanelInner);

const styles = StyleSheet.create({
  panel: {
    padding: 0,
    overflow: 'hidden',
  },
  loadingWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  panelError: {
    fontFamily: 'Jost',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  headerCount: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '500',
  },
  ownerList: {
    paddingHorizontal: spacing.md,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  ownerInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexWrap: 'wrap',
  },
  ownerName: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '500',
  },
  custodianBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  custodianBadgeText: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ownerSub: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '300',
  },
  shareWrap: {
    alignItems: 'flex-end',
    minWidth: 42,
  },
  sharePercent: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  custodyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  custodyBtnText: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '600',
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  historyLinkText: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '400',
  },
});
