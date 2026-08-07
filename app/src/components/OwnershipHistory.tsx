/**
 * OwnershipHistory — bottom sheet showing the ownership ledger timeline.
 *
 * Displays ownership_ledger entries for a co-owned item as a vertical
 * timeline. Each entry shows the entry type (purchase, buyout, gift,
 * split, etc.), amount, date, and payer name.
 *
 * Uses @expo/ui BottomSheet for display (NOT @gorhom).
 * Warm Atelier styling: gold timeline dots, Georgia headings, Jost body.
 */

import { memo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { BottomSheet } from '@expo/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { hapticSuccess } from '@/lib/haptics';
import { getOwnershipHistory } from '@/lib/co-ownership';
import { formatCurrency, formatDate, formatEnum } from '@/lib/format';
import type { OwnershipLedgerEntry, LedgerEntryType } from '@/types/items';

type OwnershipHistoryProps = {
  /** The co-owned item ID. */
  itemId: string;
  /** Whether the bottom sheet is visible. */
  isPresented: boolean;
  /** Called when the user dismisses the sheet. */
  onDismiss: () => void;
};

/** Map a ledger entry type to a MaterialCommunityIcons name. */
function entryTypeIcon(
  type: LedgerEntryType
): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  switch (type) {
    case 'purchase':
      return 'shopping-outline';
    case 'buyout':
      return 'swap-horizontal';
    case 'resale_proceeds':
      return 'currency-usd';
    case 'maintenance':
      return 'wrench-outline';
    case 'insurance':
      return 'shield-check-outline';
    case 'storage':
      return 'package-variant-closed';
    case 'adjustment':
      return 'scale-balance';
    default:
      return 'circle-outline';
  }
}

function OwnershipHistoryInner({
  itemId,
  isPresented,
  onDismiss,
}: OwnershipHistoryProps) {
  const colors = useThemeColors();
  const [entries, setEntries] = useState<OwnershipLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setError(null);
      const data = await getOwnershipHistory(itemId);
      setEntries(data);
    } catch (e: any) {
      console.warn('[OwnershipHistory] Failed to load:', e);
      setError(e?.message ?? 'Could not load ownership history.');
    }
  }, [itemId]);

  // Load when the sheet opens
  useEffect(() => {
    if (isPresented && !loading && entries.length === 0 && !error) {
      let cancelled = false;
      setLoading(true);
      loadHistory().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresented]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleClose = useCallback(() => {
    hapticSuccess();
    handleDismiss();
  }, [handleDismiss]);

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={handleDismiss}
      showDragIndicator
      snapPoints={[{ fraction: 0.7 }]}
    >
      <View style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={colors.gold}
          />
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            Ownership History
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.gold}
            />
          }
          contentContainerStyle={
            entries.length === 0 ? styles.emptyList : styles.listContent
          }
        >
          {loading ? (
            <View style={styles.placeholderWrap}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : error ? (
            <View style={styles.placeholderWrap}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={36}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.placeholderText, { color: colors.textSecondary }]}
              >
                {error}
              </Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.placeholderWrap}>
              <MaterialCommunityIcons
                name="book-open-variant"
                size={36}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.placeholderText, { color: colors.textSecondary }]}
              >
                No ownership history yet
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {entries.map((entry, index) => (
                <View key={entry.id} style={styles.timelineItem}>
                  {/* Timeline marker */}
                  <View style={styles.timelineMarker}>
                    <View
                      style={[styles.timelineDot, { backgroundColor: colors.gold }]}
                    />
                    {index < entries.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: colors.border },
                        ]}
                      />
                    )}
                  </View>

                  {/* Timeline content */}
                  <View style={styles.timelineContent}>
                    {/* Type + amount */}
                    <View style={styles.entryHeader}>
                      <View style={styles.entryTypeWrap}>
                        <MaterialCommunityIcons
                          name={entryTypeIcon(entry.entry_type)}
                          size={14}
                          color={colors.gold}
                        />
                        <Text
                          style={[
                            styles.entryType,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {formatEnum(entry.entry_type)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.entryAmount,
                          { color: colors.gold },
                        ]}
                      >
                        {formatCurrency(entry.amount, entry.currency)}
                      </Text>
                    </View>

                    {/* Payer */}
                    <Text
                      style={[
                        styles.entryPayer,
                        { color: colors.textSecondary },
                      ]}
                    >
                      by {entry.payer_name}
                    </Text>

                    {/* Date */}
                    <Text
                      style={[
                        styles.entryDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatDate(entry.created_at)}
                    </Text>

                    {/* Description */}
                    {entry.description && (
                      <Text
                        style={[
                          styles.entryDesc,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {entry.description}
                      </Text>
                    )}

                    {/* New share percentage */}
                    {entry.new_share_percentage != null && (
                      <View
                        style={[
                          styles.shareBadge,
                          { backgroundColor: colors.surfaceElevated },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="percent-outline"
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.shareBadgeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          New share: {entry.new_share_percentage.toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Close button */}
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.85}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
        >
          <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

export const OwnershipHistory = memo(OwnershipHistoryInner);

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingTop: 2,
    paddingHorizontal: spacing.md + 6,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '500',
  },
  emptyList: {
    flex: 1,
  },
  listContent: {
    gap: 0,
  },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  placeholderText: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'center',
  },
  // Timeline
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineMarker: {
    alignItems: 'center',
    width: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    minHeight: 60,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  entryTypeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexShrink: 1,
  },
  entryType: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '500',
  },
  entryAmount: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '600',
  },
  entryPayer: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    marginTop: 3,
  },
  entryDate: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '300',
    marginTop: 2,
  },
  entryDesc: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    marginTop: spacing.xs,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  shareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: spacing.xs + 2,
    alignSelf: 'flex-start',
  },
  shareBadgeText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
  },
  closeBtn: {
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  closeBtnText: {
    fontFamily: 'Jost',
    fontSize: 15,
    fontWeight: '500',
  },
});
