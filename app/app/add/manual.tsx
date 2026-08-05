/**
 * Manual Add Item screen — form for entering item details manually.
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { useCircleId } from '@/hooks/useCircleId';
import { createItem } from '@/lib/items';
import { hapticSuccess, hapticError } from '@/lib/haptics';
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
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!brand.trim() || !user?.id) return;
    setLoading(true);
    try {
      await createItem({
        owner_id: user.id, circle_id: circleId,
        brand: brand.trim(), model_name: modelName.trim() || null,
        category, color: color.trim() || null, condition, status: 'available',
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        currency: 'AED', notes: notes.trim() || null,
      });
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
            <Text style={[styles.label, { color: colors.textSecondary }]}>Brand *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. Chanel" placeholderTextColor={colors.textSecondary} value={brand} onChangeText={setBrand} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Model</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. Classic Flap Medium" placeholderTextColor={colors.textSecondary} value={modelName} onChangeText={setModelName} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <Chip key={cat.value} label={cat.label} selected={category === cat.value} onPress={() => setCategory(cat.value)} />
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. Black" placeholderTextColor={colors.textSecondary} value={color} onChangeText={setColor} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITIONS.map((cond) => (
                <Chip key={cond.value} label={cond.label} selected={condition === cond.value} onPress={() => setCondition(cond.value)} />
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Estimated Value (AED)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g. 8500" placeholderTextColor={colors.textSecondary} value={estimatedValue} onChangeText={setEstimatedValue} keyboardType="numeric" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput style={[styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Any additional details..." placeholderTextColor={colors.textSecondary} value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton label="Save Item" loading={loading} disabled={!brand.trim()} onPress={handleSave} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border }]}>
      <Text style={[styles.chipText, { color: selected ? colors.charcoal : colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, inner: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.xs },
  label: { ...typography.caption1, marginBottom: spacing.xs, marginLeft: 4, marginTop: spacing.sm },
  input: { ...typography.body, height: 48, borderRadius: radius.md, borderWidth: 0.5, paddingHorizontal: spacing.md },
  textArea: { ...typography.body, borderRadius: radius.md, borderWidth: 0.5, paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 80 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 0.5 },
  chipText: { ...typography.footnote, fontWeight: '500' },
  footer: { padding: spacing.lg },
});
