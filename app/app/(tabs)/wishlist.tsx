/**
 * Wishlist screen — shows the user's wishlist items with savings goals.
 * Allows adding new items and updating savings.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { getWishlist, addToWishlist, removeFromWishlist, updateSavings } from '@/lib/wishlist';
import { hapticSuccess, hapticError } from '@/lib/haptics';
import type { WishlistItem } from '@/types';

export default function WishlistScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getWishlist(user.id);
      setItems(data);
    } catch (e) {
      console.error('[Wishlist] Failed to fetch:', e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  const onRefresh = () => { setRefreshing(true); fetchItems(); };

  const handleRemove = (id: string) => {
    Alert.alert('Remove Item', 'Remove this from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await removeFromWishlist(id); hapticSuccess(); fetchItems(); }
        catch { hapticError(); Alert.alert('Error', 'Could not remove item.'); }
      }},
    ]);
  };

  const handleUpdateSavings = async (id: string, currentAmount: number) => {
    try { await updateSavings(id, currentAmount + 100); hapticSuccess(); fetchItems(); }
    catch { hapticError(); }
  };

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const target = item.target_price ?? item.max_price ?? 0;
    const progress = target > 0 ? Math.min((item.current_savings / target) * 100, 100) : 0;
    const display = [item.brand, item.model_name].filter(Boolean).join(' ') || 'Wishlist Item';
    return (
      <View style={[styles.itemCard, { backgroundColor: colors.surface }]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemBrand, { color: colors.textPrimary }]} numberOfLines={1}>{display}</Text>
            {item.target_price != null && (
              <Text style={[styles.itemTarget, { color: colors.textSecondary }]}>Target: AED {item.target_price.toLocaleString()}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => handleRemove(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {target > 0 && (
          <View style={styles.savingsSection}>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceElevated }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress}%` }]} />
            </View>
            <View style={styles.savingsRow}>
              <Text style={[styles.savingsText, { color: colors.textSecondary }]}>AED {item.current_savings.toLocaleString()} saved</Text>
              <Text style={[styles.savingsPercent, { color: colors.accent }]}>{Math.round(progress)}%</Text>
            </View>
            <TouchableOpacity style={[styles.addSavingsBtn, { borderColor: colors.accent }]} onPress={() => handleUpdateSavings(item.id, item.current_savings)}>
              <Text style={[styles.addSavingsText, { color: colors.accent }]}>+ Add AED 100</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!loading && items.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Wishlist' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState icon="heart-outline" title="Your Wishlist" subtitle="Save items you're dreaming of and track savings goals" />
          <View style={styles.footerButton}>
            <PrimaryButton label="Add Wishlist Item" onPress={() => setAddModalVisible(true)} />
          </View>
          <AddWishlistModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onAdded={() => { setAddModalVisible(false); fetchItems(); }} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Wishlist' }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListFooterComponent={
            <View style={styles.footerButton}>
              <PrimaryButton label="+ Add Wishlist Item" onPress={() => setAddModalVisible(true)} />
            </View>
          }
        />
        <AddWishlistModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onAdded={() => { setAddModalVisible(false); fetchItems(); }} />
      </SafeAreaView>
    </>
  );
}

function AddWishlistModal({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: () => void }) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!brand.trim() || !user?.id) return;
    setLoading(true);
    try {
      await addToWishlist({ userId: user.id, brand: brand.trim(), model_name: model.trim() || null, target_price: targetPrice ? parseFloat(targetPrice) : null });
      hapticSuccess(); setBrand(''); setModel(''); setTargetPrice(''); onAdded();
    } catch { hapticError(); Alert.alert('Error', 'Could not add wishlist item.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surfaceElevated }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add to Wishlist</Text>
          <TextInput style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Brand (e.g. Chanel)" placeholderTextColor={colors.textSecondary} value={brand} onChangeText={setBrand} />
          <TextInput style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Model (optional)" placeholderTextColor={colors.textSecondary} value={model} onChangeText={setModel} />
          <TextInput style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} placeholder="Target Price (AED)" placeholderTextColor={colors.textSecondary} value={targetPrice} onChangeText={setTargetPrice} keyboardType="numeric" />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: colors.border }]}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton label="Add" loading={loading} disabled={!brand.trim()} onPress={handleAdd} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.md },
  itemCard: { borderRadius: radius.lg, padding: spacing.md },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  itemInfo: { flex: 1 },
  itemBrand: { ...typography.bodyEmphasized, marginBottom: 2 },
  itemTarget: { ...typography.caption1 },
  savingsSection: { marginTop: spacing.sm },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.xs },
  progressFill: { height: '100%', borderRadius: 3 },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  savingsText: { ...typography.caption1 },
  savingsPercent: { ...typography.caption1, fontWeight: '600' },
  addSavingsBtn: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  addSavingsText: { ...typography.caption1, fontWeight: '600' },
  footerButton: { padding: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { ...typography.title3, textAlign: 'center', marginBottom: spacing.lg },
  modalInput: { height: 48, borderRadius: radius.md, borderWidth: 0.5, paddingHorizontal: spacing.md, marginBottom: spacing.md, ...typography.body },
  modalActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  modalBtn: { borderWidth: 0.5, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, height: 54, justifyContent: 'center' },
  modalBtnText: { ...typography.body },
});
