/**
 * RecentSharesSection — Section 5 of the segregated feed.
 * Full-width share cards with large images, brand/model, caption,
 * 4-icon reaction bar (love, save, verify, star), and inline comments.
 * Tapping "View all comments" opens the CommentSheet.
 */

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { View as MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoPlaceholder } from '@/components/ItemPhotoPlaceholder';
import { SectionHeader } from './SectionHeader';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/format';
import type { ShareCard } from '@/lib/feed';

type RecentSharesSectionProps = {
  shares: ShareCard[];
  onSeeAll?: () => void;
  onOpenComments?: (share: ShareCard) => void;
};

type ReactionType = 'love' | 'save' | 'verify' | 'star';

const REACTION_ICONS: Record<ReactionType, string> = {
  love: 'cards-heart',
  save: 'bookmark-outline',
  verify: 'check-decagram-outline',
  star: 'star-outline',
};

const REACTION_ICONS_ACTIVE: Record<ReactionType, string> = {
  love: 'cards-heart',
  save: 'bookmark',
  verify: 'check-decagram',
  star: 'star',
};

export function RecentSharesSection({
  shares,
  onSeeAll,
  onOpenComments,
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
          />
        ))}
      </View>
    </MotiView>
  );
}

function ShareCardItem({
  share,
  onOpenComments,
}: {
  share: ShareCard;
  onOpenComments?: (share: ShareCard) => void;
}) {
  const colors = useThemeColors();
  const [reactions, setReactions] = useState<Set<ReactionType>>(new Set());

  const toggleReaction = useCallback((type: ReactionType) => {
    hapticLight();
    setReactions((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const getReactionCount = (type: ReactionType, baseCount: number): number => {
    return baseCount + (reactions.has(type) ? 1 : 0);
  };

  const reactionConfig: { type: ReactionType; count: number }[] = [
    { type: 'love', count: getReactionCount('love', share.likeCount) },
    { type: 'save', count: getReactionCount('save', share.saveCount) },
    { type: 'verify', count: getReactionCount('verify', share.verifiedCount) },
    { type: 'star', count: getReactionCount('star', share.starCount) },
  ];

  const visibleComments = share.comments.slice(0, 2);
  const totalCommentCount = share.comments.length;

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

        {/* Reaction bar */}
        <View
          style={[
            styles.reactionBar,
            {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {reactionConfig.map(({ type, count }) => {
            const isActive = reactions.has(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleReaction(type)}
                style={styles.reactionItem}
              >
                <MaterialCommunityIcons
                  name={
                    isActive
                      ? (REACTION_ICONS_ACTIVE[type] as any)
                      : (REACTION_ICONS[type] as any)
                  }
                  size={12}
                  color={isActive ? colors.gold : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.reactionCount,
                    {
                      color: isActive ? colors.gold : colors.textSecondary,
                      fontWeight: isActive ? '500' : '400',
                    },
                  ]}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
          <TouchableOpacity
            onPress={() => {
              hapticSuccess();
              onOpenComments?.(share);
            }}
            activeOpacity={0.7}
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
        </View>
      </View>
    </View>
  );
}

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
  reactionBar: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 9,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionCount: {
    fontFamily: 'Jost',
    fontSize: 10.5,
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
