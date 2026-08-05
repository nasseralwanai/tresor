/**
 * Bulk Import Capture — multi-photo selection from library + camera capture.
 * Thumbnail grid of selected photos → 'Process X Items' navigates to review.
 *
 * This screen is fully functional without backend dependencies — it only
 * handles photo capture/selection. The review/processing step is a placeholder.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

type Photo = {
  uri: string;
  width: number;
  height: number;
};

export default function BulkImportScreen() {
  const colors = useThemeColors();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromLibrary = useCallback(async () => {
    hapticLight();
    setError(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos: Photo[] = result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
      hapticSuccess();
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    hapticLight();
    setError(null);
    setCameraOpen(false);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const photo: Photo = {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
      };
      setPhotos((prev) => [...prev, photo]);
      hapticSuccess();
    }
  }, []);

  const removePhoto = (index: number) => {
    hapticLight();
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    hapticSuccess();
    // TODO(phase2-review): Navigate to bulk-import-review screen
    // For now, pass selected photos as params (in a real app, use a store/context)
    router.setParams({ count: String(photos.length) });
    // Placeholder: just go back — review screen will be built next
    router.back();
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => (
    <View style={styles.thumbnailWrap}>
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: colors.charcoal }]}
        onPress={() => removePhoto(index)}
      >
        <MaterialCommunityIcons name="close" size={16} color={colors.cream} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Bulk Import' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={pickFromLibrary}
          >
            <MaterialCommunityIcons name="image-multiple" size={24} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setCameraOpen(true)}
          >
            <MaterialCommunityIcons name="camera-outline" size={24} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Camera</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}

        {/* Photo grid */}
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="camera-burst" size={48} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No photos yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Select photos from your library or capture{'\n'}multiple items with your camera.
            </Text>
          </View>
        ) : (
          <View style={styles.gridSection}>
            <Text style={[styles.gridTitle, { color: colors.textSecondary }]}>
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} selected
            </Text>
            <FlatList
              data={photos}
              keyExtractor={(_, index) => String(index)}
              renderItem={renderPhoto}
              numColumns={3}
              contentContainerStyle={styles.grid}
            />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <PrimaryButton
            label={`Process ${photos.length} ${photos.length === 1 ? 'Item' : 'Items'}`}
            disabled={photos.length === 0}
            onPress={handleProcess}
          />
        </View>

        {/* Camera source modal */}
        <Modal
          visible={cameraOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCameraOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCameraOpen(false)}
          >
            <View style={[styles.modalSheet, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Capture Item
              </Text>
              <TouchableOpacity
                style={[styles.modalOption, { borderColor: colors.border }]}
                onPress={capturePhoto}
              >
                <MaterialCommunityIcons name="camera" size={24} color={colors.accent} />
                <Text style={[styles.modalOptionText, { color: colors.textPrimary }]}>
                  Take Photo
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setCameraOpen(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 0.5,
  },
  actionLabel: {
    ...typography.bodyEmphasized,
  },
  errorText: {
    ...typography.footnote,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.title3,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.subheadline,
    textAlign: 'center',
    lineHeight: 22,
  },
  gridSection: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  gridTitle: {
    ...typography.footnote,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  thumbnailWrap: {
    flex: 1 / 3,
    padding: 3,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.title3,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
  },
  modalOptionText: {
    ...typography.body,
    flex: 1,
  },
  modalCancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.body,
  },
});
