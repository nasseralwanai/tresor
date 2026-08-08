/**
 * CommentSheet — bottom sheet modal for viewing and adding comments.
 * Uses @expo/ui BottomSheet (NOT @gorhom).
 * Shows a dimmed background, grab handle, comment list, and input field.
 * Comments persist to the database via addComment() from lib/feed.
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BottomSheet } from '@expo/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { formatRelativeTime } from '@/lib/format';
import { addComment } from '@/lib/feed';
import { hapticSuccess, hapticError } from '@/lib/haptics';
import { useAuth } from '@/hooks/useAuth';
import type { ShareCard, ShareComment } from '@/lib/feed';

type CommentSheetProps = {
  share: ShareCard | null;
  onDismiss: () => void;
  onCommentAdded?: (shareId: string, comment: ShareComment) => void;
};

function CommentSheetInner({ share, onDismiss, onCommentAdded }: CommentSheetProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState<ShareComment[]>([]);
  const inputRef = useRef<TextInput>(null);

  const isPresented = share !== null;

  // Reset local comments when a new share is opened
  useEffect(() => {
    if (share) {
      setLocalComments(share.comments);
      setCommentText('');
    }
  }, [share?.id]);

  const allComments = share ? localComments : [];

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleSubmit = useCallback(async () => {
    if (!share?.activityId || !user?.id || !commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await addComment(share.activityId, user.id, commentText);
      setLocalComments((prev) => [...prev, newComment]);
      setCommentText('');
      hapticSuccess();
      onCommentAdded?.(share.id, newComment);
    } catch (e: any) {
      console.error('[CommentSheet] Failed to add comment:', e);
      hapticError();
      // Keep the text so the user can retry
    } finally {
      setSubmitting(false);
    }
  }, [share, user?.id, commentText, submitting, onCommentAdded]);

  const canSubmit = commentText.trim().length > 0 && !submitting && !!share?.activityId;

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={handleDismiss}
      showDragIndicator
      snapPoints={[{ fraction: 0.75 }]}
    >
      <View
        style={[
          styles.sheetContent,
          { backgroundColor: colors.surface },
        ]}
      >
        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            Comments
          </Text>
          <Text style={[styles.commentCount, { color: colors.textSecondary }]}>
            {allComments.length} {allComments.length === 1 ? 'comment' : 'comments'}
          </Text>
        </View>

        {/* Comments list */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.commentsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {allComments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Avatar name={comment.authorName} size="sm" />
                <View style={{ flex: 1 }}>
                  <View style={styles.commentMeta}>
                    <Text
                      style={[styles.commentAuthor, { color: colors.textPrimary }]}
                    >
                      {comment.authorName}
                    </Text>
                    <Text
                      style={[styles.commentTime, { color: colors.textSecondary }]}
                    >
                      {formatRelativeTime(comment.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.commentText, { color: colors.textPrimary }]}
                  >
                    {comment.text}
                  </Text>
                </View>
              </View>
            ))}

            {/* Empty state */}
            {allComments.length === 0 && (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons
                  name="chat-outline"
                  size={32}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No comments yet. Be the first to share your thoughts.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Comment input */}
          <View
            style={[
              styles.inputRow,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.inputAvatar,
                { backgroundColor: colors.gold },
              ]}
            >
              <Text style={styles.inputAvatarText}>You</Text>
            </View>
            <TextInput
              ref={inputRef}
              value={commentText}
              onChangeText={setCommentText}
              editable={!!share?.activityId && !submitting}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceElevated,
                  color: colors.textPrimary,
                },
              ]}
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={canSubmit ? handleSubmit : undefined}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send comment"
              accessibilityHint="Posts your comment to the feed"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <LinearGradient
                colors={[colors.goldLight, colors.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.sendBtn,
                  { opacity: canSubmit ? 1 : 0.4 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="send" size={14} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </BottomSheet>
  );
}

export const CommentSheet = memo(CommentSheetInner);

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingTop: 2,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '500',
  },
  commentCount: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
  },
  commentsList: {
    flex: 1,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  commentAuthor: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '500',
  },
  commentTime: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '300',
  },
  commentText: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 18,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    marginTop: 4,
  },
  inputAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputAvatarText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 999,
    fontFamily: 'Jost',
    fontSize: 12,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
