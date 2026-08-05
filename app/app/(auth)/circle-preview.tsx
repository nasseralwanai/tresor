/**
 * Circle Preview screen — final onboarding step.
 * Shows 'Welcome to [Circle Name]' + member grid + CTA to enter the app.
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticSuccess } from '@/lib/haptics';

// TODO(backend): Replace with real circle data from useAuth/profile context
const MOCK_CIRCLE = {
  name: 'The Vault',
  members: [
    { id: '1', full_name: 'Sara', avatar_url: null },
    { id: '2', full_name: 'Khalid', avatar_url: null },
    { id: '3', full_name: 'Lina', avatar_url: null },
    { id: '4', full_name: 'Omar', avatar_url: null },
  ],
};

export default function CirclePreviewScreen() {
  const colors = useThemeColors();

  const handleEnterApp = () => {
    hapticSuccess();
    // Navigate to main app — replace auth stack so user can't go back
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.checkIcon, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="check" size={36} color={colors.accent} />
        </View>

        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Welcome to
        </Text>
        <Text style={[styles.circleName, { color: colors.textPrimary }]}>
          {MOCK_CIRCLE.name}
        </Text>

        {/* Member grid */}
        <View style={styles.memberGrid}>
          {MOCK_CIRCLE.members.map((member) => (
            <View
              key={member.id}
              style={[styles.memberCard, { backgroundColor: colors.surface }]}
            >
              <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.memberInitial, { color: colors.accent }]}>
                  {member.full_name.charAt(0)}
                </Text>
              </View>
              <Text
                style={[styles.memberName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {member.full_name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Start Adding Items" onPress={handleEnterApp} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  welcomeText: {
    ...typography.body,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  circleName: {
    ...typography.largeTitle,
    fontSize: 36,
    marginBottom: spacing.xxl,
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  memberCard: {
    alignItems: 'center',
    width: 88,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  memberInitial: {
    ...typography.title3,
    fontSize: 22,
  },
  memberName: {
    ...typography.caption1,
  },
  footer: {
    paddingBottom: spacing.xl,
  },
});
