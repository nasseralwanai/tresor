/**
 * RecentSharesSection — Section 5 of the segregated feed.
 * Full-width share cards with large images, brand/model, caption,
 * like button with real count, vote buttons (love/want/been_there),
 * and inline comments. Tapping "View all comments" opens the CommentSheet.
 *
 * NO prices are shown in any feed item (pricing privacy migration 0016).
 */

import { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { SectionHeader } from './SectionHeader';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/format';
import { toggleLike, castVote } from '@/lib/feed';
import { useAuth } from '@/hooks/useAuth';
import type { ShareCard, ShareComment } from '@/lib/feed';
import type { VoteType } from '@/types/items';

type RecentSharesSectionProps = {
  shares: ShareCard[];
  onSeeAll?: () => void;
  onOpenComments?: (share: ShareCard) => void;
  onLikeToggled?: (shareId: string, liked: boolean, newCount: number) => void;
  onVoteCast?: (shareId: string, voteType: VoteType, newVotes: { love: number; want: number; been_there: number }) => void;
};

const VOTE_CONFIG: { type: VoteType; icon: string; label: string }[] = [
  { type: 'love', icon: 'cards-heart-outline', label: 'Love' },
  { type: 'want', icon: 'hand-coin-outline', label: 'Want' },
  { type: 'been_there', icon: 'check-circle-outline', label: 'Been There' },
];

const VOTE_ICONS_ACTIVE: Record<VoteType, string> = {
  love: 'cards-heart',
  want: 'hand-coin',
  been_there: 'check-circle',
};

function RecentSharesSectionInner({
  shares,
  onSeeAll,
  onOpenComments,
  onLikeToggled,
  onVoteCast,
}: RecentSharesSectionProps) {
  const colors = useThemeColors();

  if (shares.length === 0) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450, delay: 320 }}
      style={styles.container}
    >
      <SectionHeader title="Recent Shares" showSeeAll onSeeAll={onSeeAll} />
      <View style={styles.feed}>
        {shares.map((share) => (
          <ShareCardItem
            key={share.id}
            share={share}
            onOpenComments={onOpenComments}
            onLikeToggled={onLikeToggled}
            onVoteCast={onVoteCast}
          />
        ))}
      </View>
    </MotiView>
  );
}

function ShareCardItem({
  share,
  onOpenComments,
  onLikeToggled,
  onVoteCast,
}: {
  share: ShareCard;
  onOpenComments?: (share: ShareCard) => void;
  onLikeToggled?: (shareId: string, liked: boolean, newCount: number) => void;
  onVoteCast?: (shareId: string, voteType: VoteType, newVotes: { love: number; want: number; been_there: number }) => void;
}) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [liked, setLiked] = useState(share.likedByMe);
  const [likeCount, setLikeCount] = useState(share.likeCount);
  const [votes, setVotes] = useState(share.votes);
  const [myVote, setMyVote] = useState<VoteType | null>(share.myVote);
  const [voting, setVoting] = useState(false);

  // Sync from props when feed data refreshes
  const propKey = `${share.id}-${share.likeCount}-${share.likedByMe}-${share.votes.love}-${share.votes.want}-${share.votes.been_there}-${share.myVote}`;
  const [lastPropKey, setLastPropKey] = useState(propKey);
  if (propKey !== lastPropKey) {
    setLastPropKey(propKey);
    setLiked(share.likedByMe);
    setLikeCount(share.likeCount);
    setVotes(share.votes);
    setMyVote(share.myVote);
  }

  const handleLike = useCallback(async () => {
    if (!share.activityId) return;
    hapticLight();

    // Optimistic update
    const newLiked = !liked;
    const newCount = likeCount + (newLiked ? 1 : -1);
    setLiked(newLiked);
    setLikeCount(newCount);

    try {
      await toggleLike(share.activityId, user?.id ?? '');
      onLikeToggled?.(share.id, newLiked, newCount);
    } catch (e: any) {
      // Revert on failure
      setLiked(!newLiked);
      setLikeCount(likeCount);
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not update like.');
    }
  }, [share.activityId, share.id, liked, likeCount, user?.id, onLikeToggled]);

  const handleVote = useCallback(async (voteType: VoteType) => {
    if (!share.activityId || voting) return;
    hapticLight();
    setVoting(true);

    // Optimistic update
    const prevVote = myVote;
    const newVotes = { ...votes };
    if (prevVote) newVotes[prevVote]--;
    if (prevVote === voteType) {
      // Toggle off
      setMyVote(null);
      setVotes(newVotes);
    } else {
      newVotes[voteType]++;
      setMyVote(voteType);
      setVotes(newVotes);
    }

    try {
      await castVote(share.activityId, user?.id ?? '', voteType);
      onVoteCast?.(share.id, voteType, newVotes);
    } catch (e: any) {
      // Revert on failure
      setMyVote(prevVote);
      setVotes(votes);
      hapticError();
      Alert.alert('Error', e?.message ?? 'Could not cast vote.');
    } finally {
      setVoting(false);
    }
  }, [share.activityId, share.id, myVote, votes, voting, user?.id, onVoteCast]);

  const handleOpenComments = useCallback(() => {
    hapticSuccess();
    onOpenComments?.(share);
  }, [onOpenComments, share]);

  const visibleComments = share.comments.slice(0, 2);
  const totalCommentCount = share.commentCount;

  return (
    <View
      style={[
        styles.shareCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Author header */}
      <View style={styles.authorRow}>
        <Avatar name={share.actorName} size="sm" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: colors.textPrimary }]}>
            {share.actorName}
          </Text>
          <Text style={[styles.shareTime, { color: colors.textSecondary }]}>
            {formatRelativeTime(share.createdAt)}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="dots-horizontal"
          size={14}
          color={colors.textSecondary}
        />
      </View>

      {/* Large image */}
      <ItemPhotoPlaceholder
        letter={share.brand}
        size={300}
        imageUrl={share.imageUrl}
        seed={share.itemId}
        style={styles.shareImage}
      />

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.brandLabel, { color: colors.gold }]}>
          {share.brand.toUpperCase()}
        </Text>
        <Text style={[styles.modelName, { color: colors.textPrimary }]}>
          {share.model ?? share.brand}
        </Text>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {share.caption}
        </Text>

        {/* Like button + comment count */}
        <View
          style={[
            styles.actionBar,
            {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={handleLike}
            accessibilityRole="button"
            accessibilityLabel={`Like, ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}${liked ? ', active' : ''}`}
            accessibilityHint={liked ? 'Remove your like' : 'Like this share'}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            style={styles.actionItem}
          >
            <MaterialCommunityIcons
              name={liked ? 'cards-heart' : 'cards-heart-outline'}
              size={14}
              color={liked ? '#E5484D' : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionCount,
                {
                  color: liked ? '#E5484D' : colors.textSecondary,
                  fontWeight: liked ? '500' : '400',
                },
              ]}
            >
              {likeCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenComments}
            accessibilityRole="button"
            accessibilityLabel={`Comments, ${totalCommentCount} ${totalCommentCount === 1 ? 'comment' : 'comments'}`}
            accessibilityHint="View and add comments"
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            style={styles.actionItem}
          >
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
              {totalCommentCount}
            </Text>
          </Pressable>
        </View>

        {/* Vote buttons */}
        {share.activityId && (
          <View style={styles.voteBar}>
            {VOTE_CONFIG.map(({ type, icon, label }) => {
              const isActive = myVote === type;
              const count = votes[type];
              return (
                <Pressable
                  key={type}
                  onPress={() => handleVote(type)}
                  disabled={voting}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, ${count} ${count === 1 ? 'vote' : 'votes'}${isActive ? ', active' : ''}`}
                  accessibilityHint={isActive ? `Remove your ${label} vote` : `Vote ${label}`}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={({ pressed }) => [
                    styles.voteBtn,
                    {
                      borderColor: isActive ? colors.gold : colors.border,
                      backgroundColor: isActive ? `${colors.gold}08` : colors.surfaceElevated,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isActive ? (VOTE_ICONS_ACTIVE[type] as any) : (icon as any)}
                    size={12}
                    color={isActive ? colors.gold : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.voteBtnText,
                      {
                        color: isActive ? colors.gold : colors.textSecondary,
                        fontWeight: isActive ? '500' : '400',
                      },
                    ]}
                  >
                    {label} {count > 0 ? count : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Inline comments */}
        <View style={styles.commentsSection}>
          {visibleComments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Text style={[styles.commentText, { color: colors.textPrimary }]}>
                <Text style={{ fontWeight: '500' }}>{comment.authorName}</Text>{' '}
                <Text style={{ color: colors.textSecondary, fontWeight: '300' }}>
                  {comment.text}
                </Text>
              </Text>
            </View>
          ))}

          {/* View all comments */}
          {totalCommentCount > 0 && (
            <TouchableOpacity
              onPress={handleOpenComments}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View all ${totalCommentCount} comments`}
              accessibilityHint="Opens comments sheet"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.viewCommentsRow}
            >
              <MaterialCommunityIcons
                name="comment-text-outline"
                size={11}
                color={colors.textSecondary}
              />
              <Text style={[styles.viewCommentsText, { color: colors.textSecondary }]}>
                View all {totalCommentCount} comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export const RecentSharesSection = memo(RecentSharesSectionInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  feed: {
    paddingHorizontal: 22,
  },
  shareCard: {
    borderRadius: radius.lg,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 11,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    paddingBottom: 9,
  },
  authorName: {
    fontFamily: 'Jost',
    fontSize: 12.5,
    fontWeight: '500',
  },
  shareTime: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
  },
  shareImage: {
    width: '100%',
    height: 200,
    borderRadius: 0,
  },
  content: {
    padding: 13,
  },
  brandLabel: {
    fontFamily: 'Jost',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.12,
    marginBottom: 2,
  },
  modelName: {
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  caption: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 18,
    marginBottom: 10,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 18,
    paddingBottom: 9,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontFamily: 'Jost',
    fontSize: 11,
  },
  voteBar: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 9,
    flexWrap: 'wrap',
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  voteBtnText: {
    fontFamily: 'Jost',
    fontSize: 10,
  },
  commentsSection: {
    paddingTop: 9,
  },
  commentRow: {
    marginBottom: 4,
  },
  commentText: {
    fontFamily: 'Jost',
    fontSize: 11,
    lineHeight: 1.5 * 11,
  },
  viewCommentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  viewCommentsText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
  },
});
