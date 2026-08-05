/**
 * My Trésor screen — shows the authenticated user's items.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { getMyItems } from '@/lib/items';
import type { Item } from '@/types';

export default function MyTresorScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getMyItems(user.id);
      setItems(data);
    } catch (e) {
      console.error('[MyTresor] Failed to fetch items:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const onRefresh = () => { setRefreshing(true); fetchItems(); };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
    >
      <View style={[styles.itemIcon, { backgroundColor: colors.surfaceElevated }]}>
        <MaterialCommunityIcons
          name={getCategoryIcon(item.category) as any}
          size={24}
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
        <View style={styles.itemMeta}>
          {item.estimated_value != null && (
            <Text style={[styles.itemValue, { color: colors.accent }]}>
              {item.currency} {item.estimated_value.toLocaleString()}
            </Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  if (!loading && items.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'My Trésor' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState
            icon="treasure-chest"
            title="Your Collection Awaits"
            subtitle="Tap the + button to add your first luxury piece"
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'My Trésor' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
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
  list: { padding: spacing.lg, gap: spacing.md },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderRadius: radius.lg, gap: spacing.md,
  },
  itemIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemBrand: { ...typography.headline, marginBottom: 2 },
  itemModel: { ...typography.subheadline, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemValue: { ...typography.footnote, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  statusText: { ...typography.caption2, textTransform: 'capitalize' },
});
