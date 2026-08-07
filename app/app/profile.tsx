/**
 * Profile Screen — user info, stats, circle membership, settings.
 * Accessible from the tab bar via a profile tab or header action.
 * Built as a standalone route at /profile for now.
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Toggle } from '@/components/Toggle';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getCurrentUserInfo } from '@/lib/profile';
import { getMyItems } from '@/lib/items';
import { getMyCircle } from '@/lib/circle';
import { formatRelativeTime } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    created_at: string;
  } | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [circle, setCircle] = useState<{ id: string; name: string } | null>(null);

  useMemo(() => {
    if (user?.id) {
      getCurrentUserInfo(user.id).then(setUserInfo);
      getMyItems(user.id).then((items) => setItemCount(items.length));
      getMyCircle(user.id).then(setCircle);
    }
  }, [user?.id]);

  const stats = [
    { label: 'Items Owned', value: itemCount, icon: 'treasure-chest' },
    { label: 'Items Lent', value: 1, icon: 'hand-coin-outline' },
    { label: 'Borrow Streak', value: 3, icon: 'fire' },
  ];

  const handleSignOut = () => {
    hapticSuccess();
    Alert.alert('Sign Out', 'This will sign you out of Trésor.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/welcome');
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not sign out.');
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <Avatar name={userInfo?.full_name ?? 'User'} size="lg" />
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {userInfo?.full_name ?? 'User'}
            </Text>
            <Text style={[styles.profilePhone, { color: colors.textSecondary }]}>
              {userInfo?.phone ?? ''}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={22} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Circle info */}
          {circle && (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="account-group-outline" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Circle
                </Text>
              </View>
              <Text style={[styles.circleName, { color: colors.textPrimary }]}>
                {circle.name}
              </Text>
              <Text style={[styles.circleInfo, { color: colors.textSecondary }]}>
                Member since {formatRelativeTime(userInfo?.created_at ?? new Date().toISOString())}
              </Text>
            </Card>
          )}

          {/* Settings */}
          <Card style={styles.section}>
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>SETTINGS</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="theme-light-dark" size={20} color={colors.textPrimary} />
                <Text style={[styles.settingText, { color: colors.textPrimary }]}>
                  Dark Mode
                </Text>
              </View>
              <Toggle value={darkMode} onValueChange={setDarkMode} />
            </View>

            <TouchableOpacity
              onPress={() => hapticLight()}
              style={[styles.settingRow, styles.settingTap]}
            >
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="bell-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.settingText, { color: colors.textPrimary }]}>
                  Notifications
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => hapticLight()}
              style={[styles.settingRow, styles.settingTap]}
            >
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="shield-key-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.settingText, { color: colors.textPrimary }]}>
                  Privacy
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => hapticLight()}
              style={[styles.settingRow, styles.settingTap]}
            >
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="help-circle-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.settingText, { color: colors.textPrimary }]}>
                  Help & Support
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </Card>

          {/* Sign out */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.signOutBtn, { borderColor: colors.error }]}
          >
            <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
            <Text style={[styles.signOutText, { color: colors.error }]}>
              Sign Out
            </Text>
          </TouchableOpacity>

          <Text style={[styles.version, { color: colors.textSecondary }]}>
            Trésor v1.0.0
          </Text>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  profileName: {
    ...typography.title2,
    fontSize: 22,
    marginTop: spacing.sm,
  },
  profilePhone: {
    ...typography.body,
    fontSize: 15,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg + 6,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 0.5,
  },
  statValue: {
    ...typography.title3,
    fontSize: 20,
  },
  statLabel: {
    ...typography.caption2,
    fontSize: 10,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: spacing.lg + 6,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyEmphasized,
    fontSize: 16,
  },
  circleName: {
    ...typography.title3,
    fontSize: 18,
  },
  circleInfo: {
    ...typography.caption1,
    fontSize: 12,
    marginTop: 4,
  },
  settingsLabel: {
    ...typography.caption2,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md - 2,
    minHeight: 44,
  },
  settingTap: {
    paddingVertical: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
  },
  settingText: {
    ...typography.body,
    fontSize: 15,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg + 6,
    marginTop: spacing.md,
    height: 50,
    borderRadius: radius.pill,
    borderWidth: 0.5,
  },
  signOutText: {
    ...typography.bodyEmphasized,
    fontSize: 15,
  },
  version: {
    ...typography.caption2,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
