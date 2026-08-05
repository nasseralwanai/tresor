import { Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet, ColorValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';

type TabIconProps = { focused: boolean; color: ColorValue; size: number };

function TabIcon({ name, color, size = 26 }: { name: string; color: ColorValue; size?: number }) {
  return <MaterialCommunityIcons name={name as any} color={color} size={size} />;
}

function AddTabButton({ color }: { color: string }) {
  return (
    <View style={styles.addButtonContainer}>
      <View style={[styles.addButton, { backgroundColor: color }]}>
        <MaterialCommunityIcons name="plus" color="#0A0A0B" size={28} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          fontSize: typography.title2.fontSize,
          fontWeight: typography.title2.fontWeight as '600',
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: typography.caption2.fontSize,
          fontWeight: typography.caption2.fontWeight as '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Trésor',
          tabBarIcon: (props: TabIconProps) => <TabIcon name="treasure-chest" color={props.color} />,
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: 'Circle',
          tabBarIcon: (props: TabIconProps) => <TabIcon name="account-group-outline" color={props.color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: (props: TabIconProps) => <TabIcon name="plus" color={props.color} />,
          tabBarButton: () => (
            <View style={styles.centerButtonWrapper}>
              <AddTabButton color={colors.accent} />
              <Text style={[styles.centerButtonLabel, { color: colors.accent }]}>Add</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: (props: TabIconProps) => <TabIcon name="heart-outline" color={props.color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: (props: TabIconProps) => <TabIcon name="bell-outline" color={props.color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  addButtonContainer: {
    alignItems: 'center',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  centerButtonLabel: {
    fontSize: typography.caption2.fontSize,
    fontWeight: typography.caption2.fontWeight as '500',
    marginTop: 4,
  },
});
