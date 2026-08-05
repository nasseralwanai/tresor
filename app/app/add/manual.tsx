/**
 * Manual Add Item Form — enter item details by hand.
 * Fields: brand, model, category picker, color, condition picker,
 * estimated value, notes, photo picker, privacy + lendable toggles.
 * On submit: call createItem() and navigate back.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Toggle } from '@/components/Toggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { createItem } from '@/lib/mockApi';
import { formatEnum } from '@/lib/format';

const CATEGORIES = ['bag', 'jewelry', 'watch', 'shoes', 'clothing', 'accessories', 'other'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];

export default function ManualAddScreen() {
  const colors = useThemeColors();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState<string>('good');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLendable, setIsLendable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = useCallback(async () => {
    hapticLight();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = async () => {
    if (!brand.trim()) {
      hapticError();
      setError('Brand is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createItem({
        brand: brand.trim(),
        model_name: model.trim() || null,
        category: category,
        color: color.trim() || null,
        condition: condition,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        notes: notes.trim() || null,
        is_private: isPrivate,
        is_lendable: isLendable,
      });
      hapticSuccess();
      router.back();
    } catch (e) {
      hapticError();
      setError('Failed to add item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Manually' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Photo picker */}
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
            <Card style={styles.photoPicker}>
              {photoUri ? (
                <View />
              ) : (
                <View style={styles.photoPickerContent}>
                  <View style={[styles.photoIcon, { backgroundColor: colors.surfaceElevated }]}>
                    <MaterialCommunityIcons name="camera-outline" size={32} color={colors.accent} />
                  </View>
                  <Text style={[styles.photoPickerTitle, { color: colors.textPrimary }]}>
                    Add Photo
                  </Text>
                  <Text style={[styles.photoPickerSub, { color: colors.textSecondary }]}>
                    Optional — tap to choose from library
                  </Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>

          {/* Brand */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>BRAND *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Chanel"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Model */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MODEL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={model}
              onChangeText={setModel}
              placeholder="e.g. Classic Flap"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Category picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
            <View style={styles.pickerRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    hapticLight();
                    setCategory(cat);
                  }}
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: category === cat ? colors.accent : colors.surface,
                      borderColor: category === cat ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      { color: category === cat ? colors.charcoal : colors.textSecondary },
                    ]}
                  >
                    {formatEnum(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>COLOR</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={color}
              onChangeText={setColor}
              placeholder="e.g. Black"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Condition picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CONDITION</Text>
            <View style={styles.pickerRow}>
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  onPress={() => {
                    hapticLight();
                    setCondition(cond);
                  }}
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: condition === cond ? colors.accent : colors.surface,
                      borderColor: condition === cond ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      { color: condition === cond ? colors.charcoal : colors.textSecondary },
                    ]}
                  >
                    {formatEnum(cond)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Estimated value */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ESTIMATED VALUE (AED)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={estimatedValue}
              onChangeText={setEstimatedValue}
              placeholder="e.g. 42000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOTES</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

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

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}

          <View style={{ height: spacing.lg }} />
        </ScrollView>

        {/* Submit button */}
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {submitting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <PrimaryButton label="Add Item" onPress={handleSubmit} />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg + 6,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  photoPicker: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  photoPickerContent: {
    alignItems: 'center',
  },
  photoIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  photoPickerTitle: {
    ...typography.bodyEmphasized,
    fontSize: 15,
  },
  photoPickerSub: {
    ...typography.caption1,
    marginTop: 4,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 0.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md - 2,
    fontSize: 15,
    fontFamily: 'system',
  },
  textArea: {
    height: 80,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 0.5,
  },
  pickerChipText: {
    ...typography.footnote,
    fontSize: 13,
  },
  settingsCard: {
    marginTop: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    ...typography.bodyEmphasized,
    fontSize: 15,
  },
  settingSub: {
    ...typography.caption1,
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    ...typography.footnote,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg + 6,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
  },
});
