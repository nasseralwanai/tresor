/**
 * Manual Add Item screen — form for entering item details manually.
 * Includes: brand, model, category picker, color, condition picker,
 * estimated value, notes, photo picker, privacy + lendable toggles.
 * Supports co-ownership: toggle to add co-owners with share percentages.
 * On submit: calls createItem() or createCoOwnedItem() and navigates back.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  ScrollView, Alert, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Toggle } from '@/components/Toggle';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { useCircleId } from '@/hooks/useCircleId';
import { createItem } from '@/lib/items';
import { createCoOwnedItem } from '@/lib/co-ownership';
import { getCircleMembers, type CircleMemberWithItems } from '@/lib/circle';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import type { ItemCategory, ItemCondition } from '@/types';

const CATEGORIES: { label: string; value: ItemCategory }[] = [
  { label: 'Bag', value: 'bag' }, { label: 'Jewelry', value: 'jewelry' },
  { label: 'Watch', value: 'watch' }, { label: 'Shoes', value: 'shoes' },
  { label: 'Clothing', value: 'clothing' }, { label: 'Accessories', value: 'accessories' },
  { label: 'Other', value: 'other' },
];

const CONDITIONS: { label: string; value: ItemCondition }[] = [
  { label: 'New', value: 'new' }, { label: 'Like New', value: 'like_new' },
  { label: 'Good', value: 'good' }, { label: 'Fair', value: 'fair' }, { label: 'Poor', value: 'poor' },
];

/** A selected co-owner with their share percentage. */
type SelectedCoOwner = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  share: string; // string for TextInput, parsed on submit
  amountPaid: string; // string for TextInput
};

export default function ManualAddScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { circleId } = useCircleId();
  const [brand, setBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('bag');
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLendable, setIsLendable] = useState(true);
  const [loading, setLoading] = useState(false);

  // Co-ownership state
  const [isCoOwned, setIsCoOwned] = useState(false);
  const [members, setMembers] = useState<CircleMemberWithItems[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedOwners, setSelectedOwners] = useState<SelectedCoOwner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Fetch circle members when co-ownership is toggled on
  useEffect(() => {
    if (isCoOwned && user?.id && members.length === 0) {
      setMembersLoading(true);
      getCircleMembers(user.id)
        .then((m) => {
          setMembers(m);
          // Pre-select the current user as a co-owner with 100% share
          const me = m.find((mem) => mem.id === user.id);
          if (me) {
            setSelectedOwners([
              {
                userId: me.id,
                displayName: me.display_name ?? 'You',
                avatarUrl: me.avatar_url,
                share: '100',
                amountPaid: '',
              },
            ]);
          }
        })
        .catch((e) => {
          console.warn('[add/manual] Failed to load circle members:', e);
        })
        .finally(() => setMembersLoading(false));
    }
  }, [isCoOwned, user?.id, members.length]);

  // Calculate share total for validation
  const shareTotal = selectedOwners.reduce(
    (sum, o) => sum + (parseFloat(o.share) || 0),
    0
  );
  const sharesValid = Math.abs(shareTotal - 100) < 0.01;

  const pickPhoto = async () => {
    hapticLight();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // Co-owner management helpers
  const handleAddCoOwner = (member: CircleMemberWithItems) => {
    hapticLight();
    if (selectedOwners.some((o) => o.userId === member.id)) return;
    setSelectedOwners((prev) => [
      ...prev,
      {
        userId: member.id,
        displayName: member.display_name ?? 'Unknown',
        avatarUrl: member.avatar_url,
        share: '',
        amountPaid: '',
      },
    ]);
    setSearchQuery('');
    setShowMemberPicker(false);
  };

  const handleRemoveCoOwner = (userId: string) => {
    hapticLight();
    setSelectedOwners((prev) => prev.filter((o) => o.userId !== userId));
  };

  const handleShareChange = (userId: string, value: string) => {
    setSelectedOwners((prev) =>
      prev.map((o) => (o.userId === userId ? { ...o, share: value } : o))
    );
  };

  const handleAmountChange = (userId: string, value: string) => {
    setSelectedOwners((prev) =>
      prev.map((o) => (o.userId === userId ? { ...o, amountPaid: value } : o))
    );
  };

  const filteredMembers = members.filter((m) => {
    // Exclude already-selected members
    if (selectedOwners.some((o) => o.userId === m.id)) return false;
    // Filter by search query
    if (searchQuery.trim()) {
      return (m.display_name ?? '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleSave = async () => {
    if (!brand.trim() || !user?.id) return;

    // Validate co-ownership shares
    if (isCoOwned) {
      if (selectedOwners.length < 2) {
        hapticError();
        Alert.alert('Co-Ownership', 'At least two co-owners are required.');
        return;
      }
      if (!sharesValid) {
        hapticError();
        Alert.alert(
          'Co-Ownership',
          `Ownership shares must sum to exactly 100%. Current total: ${shareTotal}%`
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (isCoOwned) {
        // Create co-owned item
        await createCoOwnedItem({
          brand: brand.trim(),
          model_name: modelName.trim() || null,
          category,
          color: color.trim() || null,
          condition,
          estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
          currency: 'AED',
          notes: notes.trim() || null,
          is_private: isPrivate,
          is_lendable: isLendable,
          primary_image_url: photoUri,
          circle_id: circleId,
          owners: selectedOwners.map((o) => ({
            user_id: o.userId,
            share_percentage: parseFloat(o.share),
            amount_paid: o.amountPaid ? parseFloat(o.amountPaid) : 0,
          })),
        });
      } else {
        // Create sole-owned item
        await createItem({
          owner_id: user.id, circle_id: circleId,
          brand: brand.trim(), model_name: modelName.trim() || null,
          category, color: color.trim() || null, condition, status: 'available',
          estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
          currency: 'AED', notes: notes.trim() || null,
          primary_image_url: photoUri,
          is_private: isPrivate, is_lendable: isLendable,
        });
      }
      hapticSuccess();
      router.back();
    } catch (e: any) {
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not save item.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Item Manually' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Photo picker */}
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
              <Card style={styles.photoPicker}>
                <View style={styles.photoPickerContent}>
                  <View style={[styles.photoIcon, { backgroundColor: colors.surfaceElevated }]}>
                    <MaterialCommunityIcons name="camera-outline" size={32} color={colors.accent} />
                  </View>
                  <Text style={[styles.photoPickerTitle, { color: colors.textPrimary }]}>Add Photo</Text>
                  <Text style={[styles.photoPickerSub, { color: colors.textSecondary }]}>
                    Optional — tap to choose from library
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Brand *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. Chanel" placeholderTextColor={colors.textSecondary} value={brand} onChangeText={setBrand} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Model</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. Classic Flap Medium" placeholderTextColor={colors.textSecondary} value={modelName} onChangeText={setModelName} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <Chip key={cat.value} label={cat.label} selected={category === cat.value} onPress={() => { hapticLight(); setCategory(cat.value); }} />
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. Black" placeholderTextColor={colors.textSecondary} value={color} onChangeText={setColor} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITIONS.map((cond) => (
                <Chip key={cond.value} label={cond.label} selected={condition === cond.value} onPress={() => { hapticLight(); setCondition(cond.value); }} />
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Estimated Value (AED)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. 8500" placeholderTextColor={colors.textSecondary} value={estimatedValue} onChangeText={setEstimatedValue} keyboardType="numeric" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput style={[styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Any additional details..." placeholderTextColor={colors.textSecondary} value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />

            {/* Settings */}
            <Card style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Private</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                    {isPrivate ? 'Hidden from circle' : 'Visible to circle'}
                  </Text>
                </View>
                <Toggle value={isPrivate} onValueChange={setIsPrivate} />
              </View>
              <View style={[styles.settingRow, { marginTop: spacing.md }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Lendable</Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                    {isLendable ? 'Available for lending' : 'Not for lending'}
                  </Text>
                </View>
                <Toggle value={isLendable} onValueChange={setIsLendable} />
              </View>
            </Card>

            {/* Co-ownership toggle */}
            <Card style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                    This item is co-owned
                  </Text>
                  <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                    Share ownership with circle members
                  </Text>
                </View>
                <Toggle value={isCoOwned} onValueChange={(v) => {
                  hapticLight();
                  setIsCoOwned(v);
                  if (!v) {
                    setSelectedOwners([]);
                    setShowMemberPicker(false);
                  }
                }} />
              </View>
            </Card>

            {/* Co-ownership section */}
            {isCoOwned && (
              <View style={styles.coOwnSection}>
                {/* Section header */}
                <View style={styles.coOwnHeader}>
                  <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.gold} />
                  <Text style={[styles.coOwnHeaderText, { color: colors.textPrimary }]}>
                    Co-Owners
                  </Text>
                  <View style={[
                    styles.shareTotalBadge,
                    {
                      backgroundColor: sharesValid
                        ? 'rgba(48, 164, 108, 0.12)'
                        : 'rgba(229, 72, 77, 0.12)',
                    },
                  ]}>
                    <Text style={[
                      styles.shareTotalText,
                      { color: sharesValid ? colors.success : colors.error },
                    ]}>
                      {shareTotal.toFixed(0)}%
                    </Text>
                  </View>
                </View>

                {/* Validation message */}
                {selectedOwners.length >= 2 && !sharesValid && (
                  <Text style={[styles.validationText, { color: colors.error }]}>
                    Shares must sum to 100%. Current: {shareTotal.toFixed(0)}%
                  </Text>
                )}

                {/* Selected co-owners list */}
                {selectedOwners.map((owner) => {
                  const isMe = owner.userId === user?.id;
                  return (
                    <View
                      key={owner.userId}
                      style={[
                        styles.coOwnerRow,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {/* Avatar + name */}
                      <View style={styles.coOwnerInfo}>
                        <Avatar name={owner.displayName} size="sm" />
                        <Text
                          style={[styles.coOwnerName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {isMe ? 'You' : owner.displayName}
                        </Text>
                      </View>

                      {/* Amount paid input */}
                      <TextInput
                        style={[
                          styles.shareInput,
                          styles.amountInput,
                          {
                            backgroundColor: colors.surfaceElevated,
                            color: colors.textPrimary,
                          },
                        ]}
                        placeholder="Paid"
                        placeholderTextColor={colors.textSecondary}
                        value={owner.amountPaid}
                        onChangeText={(v) => handleAmountChange(owner.userId, v)}
                        keyboardType="numeric"
                      />

                      {/* Share input */}
                      <View style={styles.shareInputWrap}>
                        <TextInput
                          style={[
                            styles.shareInput,
                            styles.sharePercentInput,
                            {
                              backgroundColor: colors.surfaceElevated,
                              color: colors.textPrimary,
                            },
                          ]}
                          placeholder="0"
                          placeholderTextColor={colors.textSecondary}
                          value={owner.share}
                          onChangeText={(v) => handleShareChange(owner.userId, v)}
                          keyboardType="numeric"
                        />
                        <Text style={[styles.percentSign, { color: colors.textSecondary }]}>
                          %
                        </Text>
                      </View>

                      {/* Remove button (don't allow removing yourself) */}
                      {!isMe && (
                        <TouchableOpacity
                          onPress={() => handleRemoveCoOwner(owner.userId)}
                          activeOpacity={0.7}
                          style={styles.removeBtn}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={16}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {/* Add co-owner button / member picker */}
                {showMemberPicker ? (
                  <View style={[
                    styles.memberPicker,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}>
                    {/* Search input */}
                    <View style={[
                      styles.searchRow,
                      { borderBottomColor: colors.border },
                    ]}>
                      <MaterialCommunityIcons
                        name="magnify"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Search circle members..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => { hapticLight(); setShowMemberPicker(false); setSearchQuery(''); }}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Members list */}
                    {membersLoading ? (
                      <View style={styles.membersLoading}>
                        <ActivityIndicator color={colors.gold} size="small" />
                      </View>
                    ) : filteredMembers.length === 0 ? (
                      <View style={styles.membersEmpty}>
                        <Text style={[styles.membersEmptyText, { color: colors.textSecondary }]}>
                          {searchQuery ? 'No members found' : 'No circle members available'}
                        </Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.membersList} nestedScrollEnabled>
                        {filteredMembers.map((member) => (
                          <TouchableOpacity
                            key={member.id}
                            onPress={() => handleAddCoOwner(member)}
                            activeOpacity={0.7}
                            style={[
                              styles.memberItem,
                              { borderBottomColor: colors.border },
                            ]}
                          >
                            <Avatar name={member.display_name ?? '?'} size="sm" />
                            <Text
                              style={[styles.memberName, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {member.display_name ?? 'Unknown'}
                            </Text>
                            <MaterialCommunityIcons
                              name="plus"
                              size={16}
                              color={colors.gold}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => { hapticLight(); setShowMemberPicker(true); }}
                    activeOpacity={0.85}
                    style={[
                      styles.addOwnerBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account-plus-outline"
                      size={16}
                      color={colors.gold}
                    />
                    <Text style={[styles.addOwnerText, { color: colors.gold }]}>
                      Add Co-Owner
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Helper text */}
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Shares must total exactly 100%. Enter amount paid (AED) for each owner.
                </Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label={isCoOwned ? 'Save Co-Owned Item' : 'Save Item'}
              loading={loading}
              disabled={!brand.trim() || (isCoOwned && (!sharesValid || selectedOwners.length < 2))}
              onPress={handleSave}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border }]} >
      <Text style={[styles.chipText, { color: selected ? colors.charcoal : colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, inner: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.xs, paddingBottom: 100 },
  photoPicker: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, marginBottom: spacing.md },
  photoPickerContent: { alignItems: 'center' },
  photoIcon: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  photoPickerTitle: { ...typography.bodyEmphasized, fontSize: 15 },
  photoPickerSub: { ...typography.caption1, marginTop: 4 },
  label: { ...typography.caption1, marginBottom: spacing.xs, marginLeft: 4, marginTop: spacing.sm, fontWeight: '500', letterSpacing: 1 },
  input: { ...typography.body, height: 48, borderRadius: radius.md, borderWidth: 0.5, paddingHorizontal: spacing.md },
  textArea: { ...typography.body, borderRadius: radius.md, borderWidth: 0.5, paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 80 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 0.5 },
  chipText: { ...typography.footnote, fontWeight: '500' },
  settingsCard: { marginTop: spacing.md },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingTitle: { fontFamily: 'Jost', fontSize: 15, fontWeight: '500' },
  settingSub: { fontFamily: 'Jost', fontSize: 12, fontWeight: '300', marginTop: 2 },
  footer: { padding: spacing.lg },
  // Co-ownership styles
  coOwnSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  coOwnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
  },
  coOwnHeaderText: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  shareTotalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  shareTotalText: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '600',
  },
  validationText: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '400',
    marginLeft: spacing.xs,
  },
  coOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 0.5,
  },
  coOwnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
    minWidth: 0,
  },
  coOwnerName: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  shareInput: {
    height: 34,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 0.5,
    borderColor: 'transparent',
    fontSize: 13,
    fontFamily: 'Jost',
    fontWeight: '500',
    textAlign: 'center',
  },
  amountInput: {
    width: 64,
  },
  shareInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sharePercentInput: {
    width: 40,
  },
  percentSign: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '500',
  },
  removeBtn: {
    padding: spacing.xs,
  },
  addOwnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderStyle: 'dashed',
  },
  addOwnerText: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '300',
    paddingHorizontal: spacing.xs,
    lineHeight: 16,
  },
  // Member picker
  memberPicker: {
    borderRadius: radius.md,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 0.5,
  },
  searchInput: {
    flex: 1,
    height: 32,
    fontSize: 14,
    fontFamily: 'Jost',
    fontWeight: '400',
  },
  membersLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  membersEmpty: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  membersEmptyText: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '300',
  },
  membersList: {
    maxHeight: 200,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 0.5,
  },
  memberName: {
    flex: 1,
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '400',
  },
});
