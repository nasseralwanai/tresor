import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/theme';

export default function WishlistScreen() {
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Wishlist' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="heart-outline"
          title="Your Wishlist"
          subtitle="Save items you're dreaming of and track savings goals"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
