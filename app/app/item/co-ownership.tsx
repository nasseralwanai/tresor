/**
 * Co-Ownership Management Screen — manage co-owners of an item.
 *
 * Accessible from the item detail page. Shows current co-owners with
 * their share %, allows adding co-owners (search circle members, assign
 * share %), and removing co-owners (only the original owner can remove).
 *
 * Co-owners can see prices (per pricing privacy migration 0016).
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorView } from '@/components/ErrorView';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import {
  getCoOwners,
  addCoOwner,
  removeCoOwner,
  getCircleMembersForCoOwnership,
} from '@/lib/co-ownership';
import { getItem } from '@/lib/items';
import { useAuth } from '@/hooks/useAuth';
import { useCircleId } from '@/hooks/useCircleId';
import { classifyError, type AppError } from '@/lib/errors';
import type { CoOwner, Item } from '@/types/items';

type SelectableMember = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export default function CoOwnershipManagementScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { circleId } = useCircleId();

  const [item, setItem] = useState<Item | null>(null);
  const [coOwners, setCoOwners] = useState<CoOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<SelectableMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<SelectableMember | null>(null);
  const [sharePct, setSharePct] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [itemData, owners] = await Promise.all([
        getItem(id),
        getCoOwners(id),
      ]);
      setItem(itemData);
      setCoOwners(owners);
    } catch (e: unknown) {
      console.error('[co-ownership] loadData error:', e);
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = item?.owner_id === user?.id;

  const handleBack = useCallback(() => {
    hapticLight();
    router.back();
  }, []);

  const handleOpenAddModal = useCallback(async () => {
    hapticLight();
    setAddModalVisible(true);
    setSelectedMember(null);
    setSharePct('');
    setMemberSearch('');

    if (circleId && id) {
      try {
        const members = await getCircleMembersForCoOwnership(circleId, id);
        setAvailableMembers(members);
      } catch (e: any) {
        console.warn('[co-ownership] Failed to load members:', e);
      }
    }
  }, [circleId, id]);

  const handleCloseAddModal = useCallback(() => {
    setAddModalVisible(false);
    setSelectedMember(null);
    setSharePct('');
  }, []);

  const handleAddCoOwner = useCallback(async () => {
    if (!id || !selectedMember || !user?.id) return;
    const pct = parseFloat(sharePct);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
      Alert.alert('Invalid Share', 'Share percentage must be between 1 and 99.');
      return;
    }

    setSubmitting(true);
    hapticLight();
    try {
      await addCoOwner(id, selectedMember.id, pct);
      hapticSuccess();
      handleCloseAddModal();
      await loadData();
    } catch (e: any) {
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not add co-owner.');
    } finally {
      setSubmitting(false);
    }
  }, [id, selectedMember, user?.id, sharePct, loadData, handleCloseAddModal]);

  const handleRemoveCoOwner = useCallback(
    (owner: CoOwner) => {
      if (!id || !user?.id) return;
      Alert.alert(
        'Remove Co-Owner',
        `Are you sure you want to remove ${owner.display_name} from this item? Their share will be redistributed to remaining owners.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              hapticLight();
              try {
                await removeCoOwner(id, owner.user_id, user.id);
                hapticSuccess();
                await loadData();
              } catch (e: any) {
                hapticError();
                Alert.alert('Error', e?.message ?? 'Could not remove co-owner.');
              }
            },
          },
        ]
      );
    },
    [id, user?.id, loadData]
  );

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return availableMembers;
    const q = memberSearch.toLowerCase();
    return availableMembers.filter((m) =>
      m.display_name.toLowerCase().includes(q)
    );
  }, [availableMembers, memberSearch]);

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

  if (error && !loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ErrorView error={error} onRetry={loadData} />
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Item Not Found' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState
            icon="package-variant"
            title="Item Not Found"
            subtitle="This piece may have been removed or is no longer available"
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Co-Ownership
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {item.brand}{item.model_name ? ` ${item.model_name}` : ''}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Current co-owners section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Current Co-Owners
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {coOwners.length} {coOwners.length === 1 ? 'owner' : 'owners'}
              </Text>
            </View>

            {coOwners.length === 0 ? (
              <Card style={styles.emptyCard}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={32}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No co-owners yet. This item is solely owned.
                </Text>
              </Card>
            ) : (
              <Card style={styles.ownersCard}>
                {coOwners.map((owner, index) => {
                  const isItemOwner = owner.user_id === item.owner_id;
                  const isYou = owner.user_id === user?.id;
                  const canRemove = isOwner && !isItemOwner;

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
                      <Avatar name={owner.display_name} size="md" />
                      <View style={styles.ownerInfo}>
                        <Text
                          style={[styles.ownerName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {isYou ? 'You' : owner.display_name}
                        </Text>
                        {isItemOwner && (
                          <View style={[styles.ownerBadge, { backgroundColor: `${colors.gold}15` }]}>
                            <Text style={[styles.ownerBadgeText, { color: colors.gold }]}>
                              Original Owner
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.shareWrap}>
                        <Text style={[styles.sharePercent, { color: isItemOwner ? colors.gold : colors.textPrimary }]}>
                          {owner.share_percentage.toFixed(0)}%
                        </Text>
                      </View>
                      {canRemove && (
                        <TouchableOpacity
                          onPress={() => handleRemoveCoOwner(owner)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${owner.display_name} as co-owner`}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={styles.removeBtn}
                        >
                          <MaterialCommunityIcons
                            name="close-circle-outline"
                            size={20}
                            color="#E5484D"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </Card>
            )}
          </View>

          {/* Add co-owner button */}
          {isOwner && (
            <View style={styles.actionSection}>
              <PrimaryButton
                label="Add Co-Owner"
                onPress={handleOpenAddModal}
              />
            </View>
          )}

          {/* Info card for non-owners */}
          {!isOwner && (
            <View style={styles.section}>
              <Card>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Only the original owner can add or remove co-owners.
                  </Text>
                </View>
              </Card>
            </View>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>

      {/* Add Co-Owner Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseAddModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Add Co-Owner
            </Text>
            <TouchableOpacity
              onPress={handleCloseAddModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {/* Member search */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              SELECT MEMBER
            </Text>
            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Search circle members..."
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            {/* Member list */}
            <View style={styles.memberList}>
              {filteredMembers.length === 0 ? (
                <Text style={[styles.emptyMembersText, { color: colors.textSecondary }]}>
                  {availableMembers.length === 0
                    ? 'No eligible circle members found.'
                    : 'No members match your search.'}
                </Text>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => {
                        hapticLight();
                        setSelectedMember(member);
                      }}
                      style={[
                        styles.memberRow,
                        {
                          borderColor: isSelected ? colors.gold : colors.border,
                          backgroundColor: isSelected ? `${colors.gold}08` : colors.surface,
                        },
                      ]}
                    >
                      <Avatar name={member.display_name} size="sm" />
                      <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                        {member.display_name}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={18}
                          color={colors.gold}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Share percentage input */}
            {selectedMember && (
              <View style={styles.shareSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  SHARE PERCENTAGE
                </Text>
                <TextInput
                  value={sharePct}
                  onChangeText={setSharePct}
                  placeholder="e.g. 25"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  style={[
                    styles.shareInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <Text style={[styles.shareHint, { color: colors.textSecondary }]}>
                  Enter a percentage between 1 and 99. Existing owners' shares will be adjusted proportionally.
                </Text>
              </View>
            )}

            <View style={{ height: spacing.xxl }} />
          </ScrollView>

          {/* Submit button */}
          {selectedMember && (
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <PrimaryButton
                label={`Add ${selectedMember.display_name.split(' ')[0]} as Co-Owner`}
                onPress={handleAddCoOwner}
                disabled={submitting || !sharePct}
              />
              {submitting && (
                <ActivityIndicator
                  color={colors.accent}
                  style={{ marginTop: 8 }}
                />
              )}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title3,
    fontSize: 20,
  },
  headerSub: {
    ...typography.caption1,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyEmphasized,
    fontSize: 16,
  },
  sectionCount: {
    ...typography.caption1,
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  ownersCard: {
    padding: 0,
    overflow: 'hidden',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  ownerInfo: {
    flex: 1,
    gap: 3,
  },
  ownerName: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '500',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  ownerBadgeText: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
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
  removeBtn: {
    padding: 4,
  },
  actionSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  infoText: {
    ...typography.body,
    fontSize: 14,
    flex: 1,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    ...typography.title3,
    fontSize: 20,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  inputLabel: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  searchInput: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 0.5,
    fontFamily: 'Jost',
    fontSize: 14,
  },
  memberList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  memberName: {
    fontFamily: 'Jost',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  emptyMembersText: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '300',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  shareSection: {
    marginTop: spacing.lg,
  },
  shareInput: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 0.5,
    fontFamily: 'Jost',
    fontSize: 16,
    fontWeight: '500',
  },
  shareHint: {
    ...typography.caption1,
    fontSize: 11,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 0.5,
  },
});
