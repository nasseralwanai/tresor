/**
 * Profile Setup screen — name + avatar, luxury editorial feel.
 *
 * Per Muaath's research §5: lightweight, respect user's time.
 * - Large circular avatar placeholder with gold border
 * - Tap to add photo (camera icon)
 * - Name input with serif placeholder
 * - "Complete Setup" button
 * - moti staggered entrance
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
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors, serifFont, bodyFont, spacing, radius } from '@/theme';
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

  // Initials from name for avatar placeholder
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.body}>
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Your Profile
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Just your name and a photo — that's all we need.
            </Text>
          </MotiView>

          {/* Avatar picker — gold-bordered circle */}
          <MotiView
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 100, delay: 120 }}
            style={styles.avatarSection}
          >
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.85}
              style={styles.avatarTouchable}
            >
              {avatarUri ? (
                <View style={[styles.avatarOuter, { borderColor: colors.gold }]}>
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                </View>
              ) : (
                <View style={[styles.avatarOuter, { borderColor: colors.gold }]}>
                  <View
                    style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}
                  >
                    {initials ? (
                      <Text style={[styles.avatarInitials, { color: colors.accent }]}>
                        {initials}
                      </Text>
                    ) : (
                      <MaterialCommunityIcons
                        name="camera-outline"
                        size={36}
                        color={colors.textSecondary}
                      />
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={pickAvatar} style={styles.addPhotoText}>
              <Text style={[styles.addPhotoLabel, { color: colors.accent }]}>
                {avatarUri ? 'Change photo' : 'Add photo'}
              </Text>
            </TouchableOpacity>
          </MotiView>

          {/* Name input */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 240 }}
          >
            <View style={styles.inputWrap}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    borderBottomColor: name ? colors.gold : colors.border,
                  },
                ]}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleComplete}
              />
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}
          </MotiView>
        </View>

        <View style={styles.footer}>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 80, delay: 360 }}
          >
            <PrimaryButton
              label="Complete Setup"
              loading={loading}
              disabled={!name.trim()}
              onPress={handleComplete}
            />
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: spacing.xl },
  body: { flex: 1, paddingTop: spacing.xl },
  title: {
    fontFamily: serifFont,
    fontSize: 30,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: bodyFont,
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl + spacing.md,
  },
  avatarTouchable: {
    padding: spacing.sm,
  },
  avatarOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: serifFont,
    fontSize: 36,
    fontWeight: '400',
  },
  addPhotoText: {
    marginTop: spacing.md,
  },
  addPhotoLabel: {
    fontFamily: bodyFont,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Input
  inputWrap: {
    marginTop: spacing.md,
  },
  input: {
    fontFamily: serifFont,
    fontSize: 22,
    fontWeight: '400',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  errorText: {
    fontFamily: bodyFont,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
