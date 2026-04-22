import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: user?.rol === 'student' ? 'Reservar' : user?.rol === 'admin' ? 'Panel Admin' : 'Registrar',
          tabBarIcon: ({ color }) =>
            user?.rol === 'student' ? (
              <IconSymbol size={28} name="house.fill" color={color} />
            ) : user?.rol === 'admin' ? (
              <IconSymbol size={28} name="person.fill" color={color} />
            ) : (
              <IconSymbol size={28} name="qrcode" color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi Perfil',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
