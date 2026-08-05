/**
 * Borrow flow layout — stack navigator for borrow-related screens.
 */

import { Stack } from 'expo-router';

export default function BorrowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="request" options={{ title: 'Request to Borrow' }} />
      <Stack.Screen name="active" options={{ title: 'Active Borrows' }} />
    </Stack>
  );
}
