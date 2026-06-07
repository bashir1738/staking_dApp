import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stake',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="⬡" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="↺" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="⊙" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color, size }: { label: string; color: string; size: number }) {
  const { Text } = require('react-native');
  return <Text style={{ color, fontSize: size * 0.75 }}>{label}</Text>;
}
