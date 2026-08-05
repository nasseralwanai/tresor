/**
 * Borrow Request Screen — request to borrow with optional note, no dates.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticSuccess } from '@/lib/haptics';
import { requestBorrow } from '@/lib/mockApi';

export default function BorrowRequestScreen() {
  const colors = useThemeColors();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await requestBorrow('', note.trim() || undefined);
    hapticSuccess();
    setSubmitting(false);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Request to Borrow' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialCommunityIcons name="hand-coin-outline" size={28} color={colors.accent} />
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Borrow Request</Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Send a request to the owner. They'll be notified and can approve or decline.
              No dates needed — just return it when you're done.
            </Text>
          </Card>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a message to the owner... e.g. 'For a wedding this weekend'"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {submitting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <PrimaryButton label="Send Request" onPress={handleSubmit} />
              <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg + 6, paddingTop: spacing.lg },
  infoCard: { marginBottom: spacing.lg },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoTitle: { ...typography.title3, fontSize: 18 },
  infoText: { ...typography.body, fontSize: 14, lineHeight: 20 },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption2, fontSize: 10, fontWeight: '500', letterSpacing: 1.2, marginBottom: spacing.sm },
  input: { borderWidth: 0.5, borderRadius: radius.sm, paddingHorizontal: spacing.md - 2, fontSize: 15 },
  textArea: { height: 100, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.lg + 6, paddingVertical: spacing.md, borderTopWidth: 0.5, gap: spacing.sm },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { ...typography.body, fontSize: 15 },
});
