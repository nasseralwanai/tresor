/**
 * Profile Setup screen — name input + avatar upload.
 * Avatar selection via expo-image-picker (camera or library).
 * 'Complete Setup' button calls createProfile, navigates to circle-preview.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { createProfile, uploadAvatar } from '@/lib/profile';
import { joinCircle } from '@/lib/invite';
import { useAuth } from '@/hooks/useAuth';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

export default function ProfileSetupScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { circleId } = useLocalSearchParams<{ circleId?: string }>();

  const pickAvatar = async () => {
    hapticLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    hapticLight();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleComplete = async () => {
    if (!name.trim()) return;
    const userId = user?.id;
    if (!userId) {
      setError('Authentication required. Please restart the onboarding flow.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let avatarUrl: string | null = null;

      if (avatarUri) {
        avatarUrl = await uploadAvatar(userId, avatarUri);
      }

      await createProfile({
        userId,
        fullName: name.trim(),
        avatarUrl,
        phone: user?.phone ?? null,
      });

      // Join the circle if we have a circleId from the invite flow
      if (circleId) {
        try {
          await joinCircle(circleId, userId);
        } catch (e) {
          // 23505 = already a member — that's fine, continue
          console.warn('[profile-setup] joinCircle failed:', e);
        }
      }
      hapticSuccess();
      router.push('/(auth)/circle-preview');
    } catch {
      hapticError();
      setError('Could not save profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.body}>
          {/* Avatar picker */}
          <View style={styles.avatarSection}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={48}
                  color={colors.textSecondary}
                />
              </View>
            )}

            <View style={styles.avatarActions}>
              <TouchableOpacity
                style={[styles.avatarButton, { backgroundColor: colors.surface }]}
                onPress={pickAvatar}
              >
                <MaterialCommunityIcons name="image-multiple" size={20} color={colors.accent} />
                <Text style={[styles.avatarButtonText, { color: colors.textPrimary }]}>
                  Library
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.avatarButton, { backgroundColor: colors.surface }]}
                onPress={takePhoto}
              >
                <MaterialCommunityIcons name="camera-outline" size={20} color={colors.accent} />
                <Text style={[styles.avatarButtonText, { color: colors.textPrimary }]}>
                  Camera
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name input */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Your name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleComplete}
          />

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Complete Setup"
            loading={loading}
            disabled={!name.trim()}
            onPress={handleComplete}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingTop: spacing.xl },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  avatarButtonText: {
    ...typography.footnote,
    fontWeight: '500',
  },
  label: {
    ...typography.caption1,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  input: {
    ...typography.body,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0.5,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    ...typography.footnote,
    marginTop: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
