/**
 * FeaturedSection — Section 1 of the segregated feed.
 * Contains the "Who Wore It Best" voting card with candidates,
 * and an active borrows summary card.
 *
 * Votes are persisted to the database via castVote() from lib/feed.
 */

import { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { castVote } from '@/lib/feed';
import { useAuth } from '@/hooks/useAuth';
import type { VoteCandidate } from '@/lib/feed';
import type { VoteType } from '@/types/items';

type FeaturedSectionProps = {
  voteCandidates: VoteCandidate[];
  activeBorrowCount: number;
  onViewBorrows?: () => void;
  onVoteCast?: (itemId: string, voteType: VoteType, voteCount: number) => void;
};

function FeaturedSectionInner({
  voteCandidates,
  activeBorrowCount,
  onViewBorrows,
  onVoteCast,
}: FeaturedSectionProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);
  const [localCandidates, setLocalCandidates] = useState<VoteCandidate[]>(voteCandidates);

  // Sync from props when feed data refreshes
  const propKey = voteCandidates.map((c) => `${c.itemId}:${c.voteCount}:${c.myVote}`).join('|');
  const [lastPropKey, setLastPropKey] = useState(propKey);
  if (propKey !== lastPropKey) {
    setLastPropKey(propKey);
    setLocalCandidates(voteCandidates);
  }

  const handleVote = useCallback(async (idx: number) => {
    const candidate = localCandidates[idx];
    if (!candidate?.activityId || voting) return;
    hapticSuccess();
    setVoting(true);

    const prevVote = candidate.myVote;
    const newVote: VoteType | null = prevVote ? null : 'love';

    // Optimistic update
    setLocalCandidates((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const newVoteCount = newVote ? c.voteCount + 1 : c.voteCount - 1;
        return { ...c, myVote: newVote, voteCount: newVoteCount };
      })
    );

    try {
      if (newVote) {
        await castVote(candidate.activityId, user?.id ?? '', newVote);
      } else {
        // Toggle off — cast vote with same type to remove
        await castVote(candidate.activityId, user?.id ?? '', prevVote!);
      }
      onVoteCast?.(candidate.itemId, newVote ?? 'love', newVote ? candidate.voteCount + 1 : candidate.voteCount - 1);
    } catch (e: any) {
      // Revert
      setLocalCandidates((prev) =>
        prev.map((c, i) =>
          i === idx ? { ...c, myVote: prevVote, voteCount: candidate.voteCount } : c
        )
      );
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not cast vote.');
    } finally {
      setVoting(false);
    }
  }, [localCandidates, voting, user?.id, onVoteCast]);

  const handleViewBorrows = useCallback(() => {
    hapticLight();
    onViewBorrows?.();
  }, [onViewBorrows]);

  if (localCandidates.length === 0 && activeBorrowCount === 0) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450 }}
      style={styles.container}
    >
      {localCandidates.length > 0 && (
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
            {localCandidates.slice(0, 2).map((candidate, idx) => {
              const isSelected = candidate.myVote !== null;
              const totalVotes = localCandidates.reduce((s, c) => s + c.voteCount, 0);
              const pct = totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0;

              return (
                <TouchableOpacity
                  key={candidate.itemId}
                  onPress={() => handleVote(idx)}
                  disabled={voting}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Vote for ${candidate.ownerName.split(' ')[0]}, ${pct}% with ${candidate.voteCount} votes${isSelected ? ', voted' : ''}`}
                  accessibilityHint={isSelected ? 'Remove your vote' : 'Vote for this candidate'}
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
                    imageUrl={candidate.imageUrl}
                    seed={candidate.itemId}
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
                    {pct}% - {candidate.voteCount} votes
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vote buttons */}
          {localCandidates.some((c) => c.myVote === null) && localCandidates.length >= 2 && (
            <View style={styles.voteBtnRow}>
              {localCandidates.slice(0, 2).map((candidate, idx) => {
                const hasVoted = candidate.myVote !== null;
                return (
                  <Pressable
                    key={candidate.itemId}
                    onPress={() => handleVote(idx)}
                    disabled={voting || hasVoted}
                    accessibilityRole="button"
                    accessibilityLabel={`Vote ${candidate.ownerName.split(' ')[0]}`}
                    accessibilityHint="Cast your vote"
                    hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                    style={({ pressed }) => [
                      styles.voteBtn,
                      idx === 0
                        ? { backgroundColor: hasVoted ? colors.surfaceElevated : colors.gold }
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
                        {
                          color: idx === 0 && !hasVoted ? colors.charcoal : colors.textSecondary,
                        },
                      ]}
                    >
                      {hasVoted ? 'Voted' : `Vote ${candidate.ownerName.split(' ')[0]}`}
                    </Text>
                  </Pressable>
                );
              })}
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
