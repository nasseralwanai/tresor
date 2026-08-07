/**
 * CommentSheet — bottom sheet modal for viewing and adding comments.
 * Uses @expo/ui BottomSheet (NOT @gorhom).
 * Shows a dimmed background, grab handle, comment list, and input field.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BottomSheet } from '@expo/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, spacing, radius } from '@/theme';
import { Avatar } from '@/components/Avatar';
import { formatRelativeTime } from '@/lib/format';
import type { ShareCard, ShareComment } from '@/lib/feed';

type CommentSheetProps = {
  share: ShareCard | null;
  onDismiss: () => void;
};

export function CommentSheet({ share, onDismiss }: CommentSheetProps) {
  const colors = useThemeColors();
  const [commentText] = useState('');

  const isPresented = share !== null;

  // Comments are not yet persisted — no comments table exists.
  // Show existing comments from the share (currently empty) with a
  // "Comments coming soon" placeholder instead of a functional input.
  const allComments: ShareComment[] = share ? share.comments : [];

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

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
          <View style={styles.commentsList}>
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

            {/* Coming soon placeholder */}
            {allComments.length === 0 && (
              <View style={styles.comingSoonWrap}>
                <MaterialCommunityIcons
                  name="chat-outline"
                  size={32}
                  color={colors.textSecondary}
                />
                <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
                  Comments coming soon
                </Text>
              </View>
            )}
          </View>

          {/* Disabled comment input — no persistence yet */}
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
              value={commentText}
              editable={false}
              placeholder="Comments coming soon"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceElevated,
                  color: colors.textPrimary,
                },
              ]}
            />
            <TouchableOpacity
              disabled
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.goldLight, colors.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.sendBtn,
                  { opacity: 0.4 },
                ]}
              >
                <MaterialCommunityIcons name="send" size={14} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </BottomSheet>
  );
}

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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  comingSoonText: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '300',
  },
});
