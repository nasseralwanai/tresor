import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/theme';

export default function CircleScreen() {
  const colors = useThemeColors();

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

const styles = StyleSheet.create({
  container: { flex: 1 },
});
