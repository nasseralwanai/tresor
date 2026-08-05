/**
 * Circle screen — shows circle members and their items.
 * Fetches members + items for the user's circle.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { EmptyState } from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCircleId } from '@/hooks/useCircleId';
import type { Item, Profile } from '@/types';

interface CircleMember extends Profile {}

export default function CircleScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { circleId, loading: circleLoading } = useCircleId();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!circleId) {
      setLoading(false);
      return;
    }
    try {
      // Fetch members
      const { data: memberRows } = await supabase
        .from('circle_members')
        .select('user_id, profiles!circle_members_user_id_fkey(*)')
        .eq('circle_id', circleId);

      const memberProfiles: CircleMember[] = (memberRows ?? [])
        .map((m: any) => m.profiles)
        .filter(Boolean);

      setMembers(memberProfiles);

      // Fetch all items in the circle
      const { data: circleItems } = await supabase
        .from('items')
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false });

      setItems(circleItems ?? []);
    } catch (e) {
      console.error('[Circle] Failed to fetch data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [circleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Group items by owner
  const sections = members.map((member) => ({
    title: member.display_name ?? member.phone ?? 'Unknown',
    data: items.filter((item) => item.owner_id === member.id),
  }));

  if (!circleLoading && !loading && members.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Circle' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState
            icon="account-group-outline"
            title="Your Circle"
            subtitle="Members of your circle will appear here"
          />
        </View>
      </>
    );
  }

  const renderMemberHeader = ({ section }: { section: { title: string; data: Item[] } }) => (
    <View style={styles.memberHeader}>
      <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceElevated }]}>
        <Text style={[styles.memberInitial, { color: colors.accent }]}>
          {section.title.charAt(0)}
        </Text>
      </View>
      <View>
        <Text style={[styles.memberName, { color: colors.textPrimary }]}>
          {section.title}
        </Text>
        <Text style={[styles.memberItemCount, { color: colors.textSecondary }]}>
          {section.data.length} {section.data.length === 1 ? 'item' : 'items'}
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Item }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.itemIcon, { backgroundColor: colors.surfaceElevated }]}>
        <MaterialCommunityIcons
          name={getCategoryIcon(item.category) as any}
          size={20}
          color={colors.accent}
        />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemBrand, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.brand}
        </Text>
        {item.model_name && (
          <Text style={[styles.itemModel, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.model_name}
          </Text>
        )}
      </View>
      {item.estimated_value != null && (
        <Text style={[styles.itemValue, { color: colors.accent }]}>
          {item.currency} {item.estimated_value.toLocaleString()}
        </Text>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Circle' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderMemberHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          stickySectionHeadersEnabled={false}
        />
      </SafeAreaView>
    </>
  );
}

function getCategoryIcon(category: string | null): string {
  switch (category) {
    case 'bag': return 'handbag-outline';
    case 'watch': return 'watch-variant';
    case 'jewelry': return 'diamond-stone';
    case 'shoes': return 'shoe-heel';
    case 'clothing': return 'tshirt-crew-outline';
    case 'accessories': return 'sunglasses';
    default: return 'treasure-chest';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    ...typography.headline,
    fontSize: 16,
  },
  memberName: {
    ...typography.bodyEmphasized,
  },
  memberItemCount: {
    ...typography.caption1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemBrand: {
    ...typography.bodyEmphasized,
    fontSize: 15,
    marginBottom: 2,
  },
  itemModel: {
    ...typography.caption1,
  },
  itemValue: {
    ...typography.footnote,
    fontWeight: '600',
  },
});
