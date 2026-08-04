import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/theme';

export default function MyTresorScreen() {
  const colors = useThemeColors();

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

const styles = StyleSheet.create({
  container: { flex: 1 },
});
