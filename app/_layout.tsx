import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import AuthService from '@/services/auth';
import useAuthStore from '@/store/useAuthStore';

const normalizeRole = (rol?: string) => {
  const trimmed = rol?.toLowerCase().trim() ?? '';
  if (trimmed === 'estudiante') return 'student';
  if (trimmed === 'seguridad') return 'security';
  return trimmed;
};

const routeForRole = (rol?: string) => {
  const normalized = normalizeRole(rol);
  if (normalized === 'admin') return '/admin';
  if (normalized === 'student') return '/student';
  if (normalized === 'security') return '/security';
  return '/login';
};

function useProtectedRoute() {
  const { isAuthenticated, user, token, logout } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'registro' || segments[0] === 'recuperar-contrasena';
    const currentRoute = segments[0] || '';
    const role = normalizeRole(user?.rol);

    if (token && !AuthService.validateToken(token)) {
      logout();
      router.replace('/login');
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace(routeForRole(role));
      return;
    }

    if (isAuthenticated && !inAuthGroup) {
      if (currentRoute === 'admin' && role !== 'admin') {
        router.replace(routeForRole(role));
      }
      if (currentRoute === 'security' && role !== 'security') {
        router.replace(routeForRole(role));
      }
      if (currentRoute === 'student' && role !== 'student') {
        router.replace(routeForRole(role));
      }
    }
  }, [isAuthenticated, segments, token, user, logout, router, isMounted]);
}

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useProtectedRoute();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#2C3E50' },
        }}
      >
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="registro"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="recuperar-contrasena"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="student"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="security"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="editar-perfil"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="historial"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="zona-admin"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
