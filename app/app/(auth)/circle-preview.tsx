/**
 * Circle Preview screen — final onboarding step.
 * Shows 'Welcome to [Circle Name]' + member grid + CTA to enter the app.
 * Fetches the user's circle data from Supabase.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { hapticSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CircleMemberInfo {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function CirclePreviewScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [circleName, setCircleName] = useState<string>('Your Circle');
  const [members, setMembers] = useState<CircleMemberInfo[]>([]);

  useEffect(() => {
    async function fetchCircle() {
      if (!user?.id) return;
      try {
        // Get the user's circle membership
        const { data: membership } = await supabase
          .from('circle_members')
          .select('circle_id, circles!circle_members_circle_id_fkey(name)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (membership?.circle_id) {
          const circle = membership.circles as any;
          setCircleName(circle?.name ?? 'Your Circle');

          // Get all members of this circle
          const { data: memberRows } = await supabase
            .from('circle_members')
            .select(
              'user_id, profiles!circle_members_user_id_fkey(id, display_name, avatar_url)'
            )
            .eq('circle_id', membership.circle_id);

          const memberInfos: CircleMemberInfo[] = (memberRows ?? [])
            .map((m: any) => m.profiles)
            .filter(Boolean)
            .map((p: any) => ({
              id: p.id,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            }));

          setMembers(memberInfos);
        }
      } catch (e) {
        console.warn('[circle-preview] Failed to fetch circle:', e);
      }
    }
    fetchCircle();
  }, [user?.id]);

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
          {circleName}
        </Text>

        {/* Member grid */}
        {members.length > 0 && (
          <View style={styles.memberGrid}>
            {members.map((member) => (
              <View
                key={member.id}
                style={[styles.memberCard, { backgroundColor: colors.surface }]}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.memberInitial, { color: colors.accent }]}>
                    {(member.display_name ?? '?').charAt(0)}
                  </Text>
                </View>
                <Text
                  style={[styles.memberName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {member.display_name ?? 'Unknown'}
                </Text>
              </View>
            ))}
          </View>
        )}
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
