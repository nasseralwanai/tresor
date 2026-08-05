/**
 * Item Detail Screen — full item view with parallax header,
 * tabbed sections (Details | History | Lending), and borrow actions.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Toggle } from '@/components/Toggle';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getItem, updateItem } from '@/lib/mockApi';
import {
  getActiveBorrowForItem,
  getItemBorrowHistory,
  markReturned,
  requestBorrow,
} from '@/lib/mockApi';
import { getCurrentUser } from '@/lib/mockApi';
import { formatCurrency, formatEnum, formatDate, formatRelativeTime } from '@/lib/format';
import type { Item, BorrowTransaction } from '@/types/items';

type Tab = 'details' | 'history' | 'lending';

export default function ItemDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);
  const [borrowHistory, setBorrowHistory] = useState<BorrowTransaction[]>([]);
  const [activeBorrow, setActiveBorrow] = useState<BorrowTransaction | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLendable, setIsLendable] = useState(true);
  const currentUser = useMemo(() => getCurrentUser(), []);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [itemData, history, borrow] = await Promise.all([
      getItem(id),
      getItemBorrowHistory(id),
      getActiveBorrowForItem(id),
    ]);
    setItem(itemData);
    setBorrowHistory(history);
    setActiveBorrow(borrow);
    if (itemData) {
      setIsPrivate(itemData.is_private);
      setIsLendable(itemData.is_lendable);
    }
    setLoading(false);
  }, [id]);

  useMemo(() => {
    loadData();
  }, []);

  const handlePrivacyToggle = async (value: boolean) => {
    setIsPrivate(value);
    if (item) {
      await updateItem(item.id, { is_private: value });
    }
  };

  const handleLendableToggle = async (value: boolean) => {
    setIsLendable(value);
    if (item) {
      await updateItem(item.id, { is_lendable: value });
    }
  };

  const handleRequestBorrow = async () => {
    hapticSuccess();
    if (item) {
      await requestBorrow(item.id);
      router.push('/borrow/request' as any);
    }
  };

  const handleMarkReturned = async () => {
    hapticSuccess();
    if (activeBorrow) {
      await markReturned(activeBorrow.id);
      setActiveBorrow(null);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.accent} style={{ marginTop: 100 }} />
        </View>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Item Not Found' }} />
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Item not found</Text>
        </View>
      </>
    );
  }

  const isOwner = item.owner_id === currentUser.id;
  const isBorrowedByMe = activeBorrow?.borrower_id === currentUser.id;
  const canBorrow = !isOwner && item.is_lendable && !activeBorrow;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Parallax-style header */}
          <View style={styles.headerWrap}>
            <ItemPhotoPlaceholder
              letter={item.brand}
              size={320}
              style={[styles.headerPhoto, { width: '100%', height: 320 }]}
            />
            {/* Back button overlay */}
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                router.back();
              }}
              style={[styles.backBtn, { backgroundColor: colors.surface }]}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            {/* Status badge overlay */}
            <View style={styles.statusOverlay}>
              <Badge
                variant={item.status === 'borrowed' ? 'lent' : 'available'}
                label={item.status === 'borrowed' ? 'Lent' : 'Available'}
              />
            </View>
          </View>

          {/* Item info */}
          <View style={styles.itemInfoSection}>
            <Text style={[styles.brandLabel, { color: colors.accent }]}>
              {item.brand.toUpperCase()}
            </Text>
            <Text style={[styles.modelName, { color: colors.textPrimary }]}>
              {item.model_name || 'Untitled'}
            </Text>
            <View style={styles.ownerRow}>
              <Avatar name={item.owner_name} size="sm" />
              <Text style={[styles.ownerName, { color: colors.textSecondary }]}>
                {isOwner ? 'You' : item.owner_name}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          {canBorrow && (
            <View style={styles.actionSection}>
              <PrimaryButton
                label="Request to Borrow"
                onPress={handleRequestBorrow}
              />
            </View>
          )}
          {isBorrowedByMe && activeBorrow && (
            <View style={styles.actionSection}>
              <PrimaryButton
                label="Mark Returned"
                onPress={handleMarkReturned}
              />
            </View>
          )}

          {/* Tabs */}
          <View style={[styles.tabBar, { borderColor: colors.border }]}>
            {(['details', 'history', 'lending'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  hapticLight();
                  setActiveTab(tab);
                }}
                style={styles.tab}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: activeTab === tab ? colors.accent : colors.textSecondary,
                      fontWeight: activeTab === tab ? '600' : '400',
                    },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {activeTab === tab && (
                  <View style={[styles.tabIndicator, { backgroundColor: colors.accent }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === 'details' && (
            <DetailsTab item={item} isOwner={isOwner} isPrivate={isPrivate} isLendable={isLendable}
              onPrivacyToggle={handlePrivacyToggle} onLendableToggle={handleLendableToggle} />
          )}
          {activeTab === 'history' && <HistoryTab history={borrowHistory} />}
          {activeTab === 'lending' && (
            <LendingTab item={item} activeBorrow={activeBorrow} isOwner={isOwner}
              isBorrowedByMe={isBorrowedByMe} onMarkReturned={handleMarkReturned} />
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </>
  );
}

// ── Details Tab ──

function DetailsTab({
  item,
  isOwner,
  isPrivate,
  isLendable,
  onPrivacyToggle,
  onLendableToggle,
}: {
  item: Item;
  isOwner: boolean;
  isPrivate: boolean;
  isLendable: boolean;
  onPrivacyToggle: (v: boolean) => void;
  onLendableToggle: (v: boolean) => void;
}) {
  const colors = useThemeColors();

  const details = [
    { label: 'Category', value: item.category ? formatEnum(item.category) : '—' },
    { label: 'Color', value: item.color ?? '—' },
    { label: 'Condition', value: formatEnum(item.condition) },
    { label: 'Material', value: item.material ?? '—' },
    { label: 'Size', value: item.size ?? '—' },
    { label: 'Estimated Value', value: formatCurrency(item.estimated_value, item.currency) },
    { label: 'Authenticity', value: item.authenticity_verified ? 'Verified' : 'Unverified' },
  ];

  return (
    <View style={styles.tabContent}>
      {/* Detail rows */}
      <Card style={styles.detailsCard}>
        {details.map((detail, index) => (
          <View
            key={detail.label}
            style={[
              styles.detailRow,
              index < details.length - 1 && { borderBottomWidth: 0.5, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {detail.label}
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {detail.value}
            </Text>
          </View>
        ))}
      </Card>

      {/* Notes */}
      {item.notes && (
        <Card style={styles.notesCard}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>NOTES</Text>
          <Text style={[styles.notesText, { color: colors.textPrimary }]}>{item.notes}</Text>
        </Card>
      )}

      {/* Owner-only settings */}
      {isOwner && (
        <Card style={styles.settingsCard}>
          <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>SETTINGS</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Private</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                {isPrivate ? 'Hidden from circle' : 'Visible to circle'}
              </Text>
            </View>
            <Toggle value={isPrivate} onValueChange={onPrivacyToggle} />
          </View>
          <View style={[styles.settingRow, { marginTop: spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Lendable</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                {isLendable ? 'Available for lending' : 'Not for lending'}
              </Text>
            </View>
            <Toggle value={isLendable} onValueChange={onLendableToggle} />
          </View>
        </Card>
      )}
    </View>
  );
}

// ── History Tab ──

function HistoryTab({ history }: { history: BorrowTransaction[] }) {
  const colors = useThemeColors();

  if (history.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <MaterialCommunityIcons name="history" size={40} color={colors.textSecondary} />
        <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>
          No history yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.timeline}>
        {history.map((tx, index) => (
          <View key={tx.id} style={styles.timelineItem}>
            {/* Timeline dot and line */}
            <View style={styles.timelineMarker}>
              <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
              {index < history.length - 1 && (
                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              )}
            </View>
            {/* Content */}
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, { color: colors.textPrimary }]}>
                {tx.borrower_name} borrowed {tx.item_brand}
              </Text>
              <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>
                {formatDate(tx.borrowed_at ?? tx.requested_at)}
              </Text>
              {tx.borrower_note && (
                <Text style={[styles.timelineNote, { color: colors.textSecondary }]}>
                  "{tx.borrower_note}"
                </Text>
              )}
              {tx.returned_at && (
                <View style={[styles.timelineStatus, { backgroundColor: colors.surfaceElevated }]}>
                  <MaterialCommunityIcons name="check" size={12} color={colors.success} />
                  <Text style={[styles.timelineStatusText, { color: colors.success }]}>
                    Returned {formatRelativeTime(tx.returned_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Lending Tab ──

function LendingTab({
  item,
  activeBorrow,
  isOwner,
  isBorrowedByMe,
  onMarkReturned,
}: {
  item: Item;
  activeBorrow: BorrowTransaction | null;
  isOwner: boolean;
  isBorrowedByMe: boolean;
  onMarkReturned: () => void;
}) {
  const colors = useThemeColors();

  if (!item.is_lendable) {
    return (
      <View style={styles.emptyTab}>
        <MaterialCommunityIcons name="hand-back-right-off-outline" size={40} color={colors.textSecondary} />
        <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>
          This item is not available for lending
        </Text>
      </View>
    );
  }

  if (activeBorrow) {
    return (
      <View style={styles.tabContent}>
        <Card>
          <View style={styles.lendingHeader}>
            <MaterialCommunityIcons name="hand-coin-outline" size={24} color={colors.accent} />
            <Text style={[styles.lendingTitle, { color: colors.textPrimary }]}>
              {isOwner ? `Item is with ${activeBorrow.borrower_name}` : `Borrowing from ${activeBorrow.lender_name}`}
            </Text>
          </View>
          <Text style={[styles.lendingDate, { color: colors.textSecondary }]}>
            Since {formatDate(activeBorrow.borrowed_at ?? activeBorrow.requested_at)}
          </Text>
          {activeBorrow.borrower_note && (
            <View style={[styles.lendingNote, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.lendingNoteLabel, { color: colors.textSecondary }]}>NOTE</Text>
              <Text style={[styles.lendingNoteText, { color: colors.textPrimary }]}>
                "{activeBorrow.borrower_note}"
              </Text>
            </View>
          )}
          {isBorrowedByMe && (
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                onMarkReturned();
              }}
              style={[styles.markReturnedBtn, { backgroundColor: colors.accent }]}
            >
              <MaterialCommunityIcons name="check" size={18} color={colors.charcoal} />
              <Text style={[styles.markReturnedText, { color: colors.charcoal }]}>
                Mark Returned
              </Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              onPress={() => hapticLight()}
              style={[styles.nudgeBtn, { borderColor: colors.border }]}
            >
              <MaterialCommunityIcons name="bell-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.nudgeBtnText, { color: colors.textPrimary }]}>
                Nudge {activeBorrow.borrower_name}
              </Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.emptyTab}>
      <MaterialCommunityIcons name="check-circle-outline" size={40} color={colors.success} />
      <Text style={[styles.emptyTabText, { color: colors.textSecondary }]}>
        Available for lending
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    position: 'relative',
    width: '100%',
    height: 320,
  },
  headerPhoto: {
    borderRadius: 0,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.lg + 6,
  },
  itemInfoSection: {
    paddingHorizontal: spacing.lg + 6,
    paddingTop: spacing.md,
  },
  brandLabel: {
    ...typography.caption2,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modelName: {
    ...typography.title2,
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ownerName: {
    ...typography.footnote,
  },
  actionSection: {
    paddingHorizontal: spacing.lg + 6,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    position: 'relative',
  },
  tabLabel: {
    ...typography.bodyEmphasized,
    fontSize: 14,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 2,
    borderRadius: 1,
  },
  tabContent: {
    paddingHorizontal: spacing.lg + 6,
    paddingTop: spacing.md,
  },
  detailsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
  },
  detailLabel: {
    ...typography.body,
    fontSize: 15,
  },
  detailValue: {
    ...typography.bodyEmphasized,
    fontSize: 15,
  },
  notesCard: {
    marginTop: spacing.md,
  },
  notesLabel: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  settingsCard: {
    marginTop: spacing.md,
  },
  settingsLabel: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    ...typography.bodyEmphasized,
    fontSize: 15,
  },
  settingSub: {
    ...typography.caption1,
    fontSize: 12,
    marginTop: 2,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyTabText: {
    ...typography.body,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
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
    minHeight: 50,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  timelineTitle: {
    ...typography.bodyEmphasized,
    fontSize: 14,
  },
  timelineDate: {
    ...typography.caption1,
    fontSize: 12,
    marginTop: 2,
  },
  timelineNote: {
    ...typography.footnote,
    fontSize: 13,
    marginTop: 6,
    fontStyle: 'italic',
  },
  timelineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  timelineStatusText: {
    ...typography.caption2,
    fontSize: 11,
  },
  // Lending tab
  lendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  lendingTitle: {
    ...typography.bodyEmphasized,
    fontSize: 15,
    flex: 1,
  },
  lendingDate: {
    ...typography.caption1,
    fontSize: 12,
  },
  lendingNote: {
    borderRadius: radius.sm,
    padding: spacing.md - 2,
    marginTop: spacing.md,
  },
  lendingNoteLabel: {
    ...typography.caption2,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  lendingNoteText: {
    ...typography.body,
    fontSize: 14,
  },
  markReturnedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  markReturnedText: {
    ...typography.bodyEmphasized,
    fontSize: 15,
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 0.5,
    marginTop: spacing.sm,
  },
  nudgeBtnText: {
    ...typography.body,
    fontSize: 14,
  },
});
