/**
 * FeaturedSection — Section 1 of the segregated feed.
 * Contains the "Who Wore It Best" voting card with candidates,
 * and an active borrows summary card.
 */

import { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import type { VoteCandidate } from '@/lib/feed';

type FeaturedSectionProps = {
  voteCandidates: VoteCandidate[];
  activeBorrowCount: number;
  onViewBorrows?: () => void;
};

function FeaturedSectionInner({
  voteCandidates,
  activeBorrowCount,
  onViewBorrows,
}: FeaturedSectionProps) {
  const colors = useThemeColors();
  const [voteSelected, setVoteSelected] = useState<number | null>(null);

  const handleVote = useCallback((idx: number) => {
    hapticSuccess();
    setVoteSelected(idx);
  }, []);

  const handleViewBorrows = useCallback(() => {
    hapticLight();
    onViewBorrows?.();
  }, [onViewBorrows]);

  if (voteCandidates.length === 0 && activeBorrowCount === 0) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450 }}
      style={styles.container}
    >
      {voteCandidates.length > 0 && (
        <View
          style={[
            styles.voteCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: colors.gold,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.voteHeader}>
            <View
              style={[
                styles.voteIcon,
                { backgroundColor: `${colors.gold}15` },
              ]}
            >
              <MaterialCommunityIcons name="trophy-outline" size={13} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.voteTitle, { color: colors.textPrimary }]}>
                Who Wore It Best?
              </Text>
              <Text style={[styles.voteSub, { color: colors.textSecondary }]}>
                Vote for this week&apos;s best styled item
              </Text>
            </View>
          </View>

          {/* Candidates */}
          <View style={styles.voteRow}>
            {voteCandidates.slice(0, 2).map((candidate, idx) => {
              const isSelected = voteSelected === idx;
              const totalVotes = voteCandidates.reduce((s, c) => s + c.voteCount, 0);
              const pct = totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0;

              return (
                <TouchableOpacity
                  key={candidate.itemId}
                  onPress={() => handleVote(idx)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Vote for ${candidate.ownerName.split(' ')[0]}, ${pct}% with ${candidate.voteCount} votes`}
                  accessibilityHint="Vote for this candidate"
                  style={[
                    styles.voteCandidate,
                    {
                      borderColor: isSelected ? colors.gold : colors.border,
                      backgroundColor: isSelected ? `${colors.gold}08` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <ItemPhotoPlaceholder
                    letter={candidate.brand}
                    size={54}
                    style={styles.votePhoto}
                  />
                  <Text
                    style={[
                      styles.voteName,
                      { color: isSelected ? colors.gold : colors.textPrimary },
                    ]}
                  >
                    {candidate.ownerName.split(' ')[0]}
                  </Text>
                  <Text
                    style={[
                      styles.votePct,
                      { color: isSelected ? colors.gold : colors.textSecondary },
                    ]}
                  >
                    {pct}% · {candidate.voteCount} votes
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vote buttons */}
          {voteSelected === null && voteCandidates.length >= 2 && (
            <View style={styles.voteBtnRow}>
              {voteCandidates.slice(0, 2).map((candidate, idx) => (
                <Pressable
                  key={candidate.itemId}
                  onPress={() => handleVote(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={`Vote ${candidate.ownerName.split(' ')[0]}`}
                  accessibilityHint="Cast your vote"
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                  style={({ pressed }) => [
                    styles.voteBtn,
                    idx === 0
                      ? { backgroundColor: colors.gold }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.voteBtnText,
                      { color: idx === 0 ? colors.charcoal : colors.textPrimary },
                    ]}
                  >
                    Vote {candidate.ownerName.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Active borrows summary */}
      {activeBorrowCount > 0 && (
        <TouchableOpacity
          onPress={handleViewBorrows}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${activeBorrowCount} ${activeBorrowCount === 1 ? 'item' : 'items'} currently borrowed`}
          accessibilityHint="View all active borrows"
          style={[
            styles.borrowSummary,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderLeftColor: colors.gold,
            },
          ]}
        >
          <View
            style={[
              styles.borrowIcon,
              { backgroundColor: `${colors.gold}15` },
            ]}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={16} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.borrowCount, { color: colors.textPrimary }]}>
              {activeBorrowCount} {activeBorrowCount === 1 ? 'item' : 'items'} currently borrowed
            </Text>
            <Text style={[styles.borrowSub, { color: colors.textSecondary }]}>
              Tap to view all active borrows
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </MotiView>
  );
}

export const FeaturedSection = memo(FeaturedSectionInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    paddingHorizontal: 22,
  },
  voteCard: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderLeftWidth: 2,
    padding: spacing.sm + 2,
    marginBottom: 11,
  },
  voteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: spacing.sm,
  },
  voteIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteTitle: {
    fontFamily: 'Jost',
    fontSize: 12.5,
    fontWeight: '500',
  },
  voteSub: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
    marginTop: 1,
  },
  voteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  voteCandidate: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1.5,
  },
  votePhoto: {
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  voteName: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '500',
  },
  votePct: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  voteBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voteBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteBtnText: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '500',
  },
  borrowSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderLeftWidth: 2,
    padding: spacing.sm + 2,
    marginBottom: 11,
  },
  borrowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borrowCount: {
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '500',
  },
  borrowSub: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
    marginTop: 1,
  },
});
