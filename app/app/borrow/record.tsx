/**
 * Record a Borrow Screen — offline borrow flow (Plate XV).
 *
 * Owner lends an item in person and records it. No request or approval.
 * 1. Select borrower from circle members
 * 2. Optional note + expected return date
 * 3. Record → item goes immediately to 'active' status
 *
 * PRICING PRIVACY: No price shown on this screen (spec §2.5.2).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { getItem } from '@/lib/items';
import { recordOfflineBorrow } from '@/lib/borrow';
import { getCircleMembers } from '@/lib/circle';
import { useAuth } from '@/hooks/useAuth';
import type { Item } from '@/types/items';
import type { CircleMemberWithItems } from '@/lib/circle';

type Duration = 'none' | '3days' | '1week' | '2weeks';

export default function RecordBorrowScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [members, setMembers] = useState<CircleMemberWithItems[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<CircleMemberWithItems | null>(null);
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState<Duration>('none');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!itemId || !user?.id) { setLoading(false); return; }
      try {
        const [itemData, memberData] = await Promise.all([
          getItem(itemId),
          getCircleMembers(user.id),
        ]);
        setItem(itemData);
        // Exclude self from borrower list
        setMembers(memberData.filter((m) => m.id !== user.id));
      } catch (e: any) {
        console.error('[record-borrow] load error:', e);
        Alert.alert('Error', e?.message ?? 'Could not load data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [itemId, user?.id]);

  const handleRecord = useCallback(async () => {
    if (!user?.id || !itemId || !selectedBorrower || !item) return;
    setSubmitting(true);
    hapticLight();
    try {
      let expectedReturn: Date | null = null;
      const now = new Date();
      switch (duration) {
        case '3days': expectedReturn = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); break;
        case '1week': expectedReturn = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
        case '2weeks': expectedReturn = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); break;
      }

      await recordOfflineBorrow({
        itemId,
        borrowerId: selectedBorrower.id,
        lenderId: user.id,
        circleId: item.circle_id,
        note: note.trim() || null,
        expectedReturnDate: expectedReturn,
      });

      hapticSuccess();
      Alert.alert('Borrow Recorded', `${selectedBorrower.display_name} has been recorded as borrowing this piece.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      hapticError();
      console.error('[record-borrow] error:', e);
      Alert.alert('Error', e?.message ?? 'Could not record the borrow.');
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, itemId, selectedBorrower, item, note, duration]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Record a Borrow' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.accent} style={{ marginTop: 100 }} />
        </View>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'Record a Borrow' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Item not found.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Record a Borrow' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Item summary — NO PRICE per privacy rules */}
        <Card style={styles.itemCard}>
          <View style={styles.itemRow}>
            <ItemPhotoPlaceholder
              letter={item.brand}
              size={56}
              imageUrl={item.primary_image_url}
              seed={item.id}
              style={styles.itemPhoto}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemBrand, { color: colors.textPrimary }]}>
                {item.brand}
              </Text>
              <Text style={[styles.itemModel, { color: colors.textSecondary }]}>
                {item.model_name || '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Borrower selection */}
        <Text style={[styles.kicker, { color: colors.textSecondary }]}>WHO IS BORROWING?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.borrowerScroll}>
          {members.map((member) => {
            const isSelected = selectedBorrower?.id === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                onPress={() => { hapticLight(); setSelectedBorrower(member); }}
                style={styles.borrowerItem}
              >
                <View style={[
                  styles.borrowerAvatarWrap,
                  isSelected && { shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
                ]}>
                  <Avatar
                    name={member.display_name ?? 'Unknown'}
                    size="md"
                  />
                  {isSelected && (
                    <View style={[styles.selectedRing, { borderColor: colors.accent }]} />
                  )}
                </View>
                <Text style={[
                  styles.borrowerName,
                  { color: isSelected ? colors.accent : colors.textSecondary },
                  isSelected && { fontWeight: '500' },
                ]}>
                  {(member.display_name ?? 'Unknown').split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {selectedBorrower && (
          <Text style={[styles.selectedText, { color: colors.textSecondary }]}>
            Lending to{' '}
            <Text style={{ fontWeight: '500', color: colors.textPrimary }}>
              {selectedBorrower.display_name}
            </Text>
            {selectedBorrower.taste_label ? ` · ${selectedBorrower.taste_label}` : ''}
          </Text>
        )}

        {/* Optional note */}
        <Text style={[styles.kicker, { color: colors.textSecondary, marginTop: spacing.lg }]}>A NOTE (OPTIONAL)</Text>
        <Card style={styles.noteCard}>
          <TextInput
            style={[styles.noteInput, { color: colors.textPrimary }]}
            value={note}
            onChangeText={setNote}
            placeholder="For the gala, handed over at dinner…"
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </Card>

        {/* Expected return */}
        <Text style={[styles.kicker, { color: colors.textSecondary, marginTop: spacing.lg }]}>EXPECTED RETURN</Text>
        <View style={styles.chipRow}>
          {([
            { key: 'none', label: 'No set date' },
            { key: '3days', label: '3 days' },
            { key: '1week', label: '1 week' },
            { key: '2weeks', label: '2 weeks' },
          ] as { key: Duration; label: string }[]).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => { hapticLight(); setDuration(opt.key); }}
              style={[
                styles.chip,
                duration === opt.key
                  ? { backgroundColor: colors.accent, borderColor: colors.accent }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[
                styles.chipText,
                { color: duration === opt.key ? colors.charcoal : colors.textSecondary },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Record button */}
        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton
            label={submitting ? 'Recording…' : 'Record Borrow'}
            onPress={handleRecord}
            disabled={!selectedBorrower || submitting}
          />
        </View>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          The piece will be marked as borrowed immediately. You can mark it returned at any time.
        </Text>

        {/* 2-state timeline */}
        <Text style={[styles.kicker, { color: colors.textSecondary, marginTop: spacing.lg }]}>HOW IT UNFOLDS</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineRow}>
            <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.timelineState, { color: colors.textPrimary }]}>Active</Text>
              <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                {selectedBorrower
                  ? `The piece is in ${selectedBorrower.display_name}'s care`
                  : 'The piece is in the borrower\'s care'}
              </Text>
            </View>
          </View>
          <View style={styles.timelineRow}>
            <View style={[styles.timelineDot, { backgroundColor: colors.border }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.timelineState, { color: colors.textSecondary }]}>Returned</Text>
              <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                Condition confirmed, history recorded
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.offlineNote, { color: colors.textSecondary }]}>
          No approval needed — an offline lend, recorded for your own register.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  itemCard: { marginHorizontal: spacing.lg + 6, marginTop: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemPhoto: { borderRadius: 10 },
  itemBrand: { ...typography.bodyEmphasized, fontSize: 15 },
  itemModel: { ...typography.caption1, fontSize: 12, marginTop: 2 },
  kicker: { ...typography.caption2, fontSize: 10, fontWeight: '500', letterSpacing: 1.5, marginHorizontal: spacing.lg + 6, marginBottom: spacing.sm },
  borrowerScroll: { paddingHorizontal: spacing.lg + 6, marginBottom: spacing.xs },
  borrowerItem: { alignItems: 'center', marginRight: spacing.md, gap: 6 },
  borrowerAvatarWrap: { position: 'relative', borderRadius: 28, overflow: 'hidden' },
  selectedRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 31, borderWidth: 2.5 },
  borrowerName: { ...typography.caption2, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  selectedText: { ...typography.footnote, fontSize: 12, marginHorizontal: spacing.lg + 6, marginTop: spacing.xs },
  noteCard: { marginHorizontal: spacing.lg + 6 },
  noteInput: { ...typography.body, fontSize: 13, minHeight: 48, padding: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.lg + 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 0.5 },
  chipText: { ...typography.footnote, fontSize: 13 },
  helperText: { ...typography.caption1, fontSize: 10.5, textAlign: 'center', marginTop: spacing.sm, marginHorizontal: spacing.lg + 6, letterSpacing: 0.3 },
  timeline: { marginHorizontal: spacing.lg + 6, gap: 0 },
  timelineRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineState: { ...typography.bodyEmphasized, fontSize: 14 },
  timelineDesc: { ...typography.caption1, fontSize: 12, marginTop: 2 },
  offlineNote: { ...typography.caption1, fontSize: 10.5, marginHorizontal: spacing.lg + 6, marginTop: spacing.sm },
  errorText: { ...typography.body, textAlign: 'center', marginTop: 100 },
});
