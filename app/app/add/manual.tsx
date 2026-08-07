/**
 * Manual Add Item screen — form for entering item details manually.
 * Includes: brand, model, category picker, color, condition picker,
 * estimated value, notes, photo picker, privacy + lendable toggles.
 * On submit: call createItem() and navigate back.
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Toggle } from '@/components/Toggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { useCircleId } from '@/hooks/useCircleId';
import { createItem } from '@/lib/items';
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
        primary_image_url: photoUri,
        is_private: isPrivate, is_lendable: isLendable,
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
  settingTitle: { ...typography.bodyEmphasized, fontSize: 15 },
  settingSub: { ...typography.caption1, fontSize: 12, marginTop: 2 },
  footer: { padding: spacing.lg },
});
