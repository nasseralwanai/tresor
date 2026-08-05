import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/theme';

export default function ActivityScreen() {
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Activity' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="bell-outline"
          title="No Activity Yet"
          subtitle="Borrow requests, new items, and returns will show here"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
