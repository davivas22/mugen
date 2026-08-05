import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { ThemeProvider as MugenThemeProvider, useColors } from './context/ThemeContext';
import { createNotificationChannels, setupForegroundHandler } from '../services/notifications';

export const unstable_settings = { anchor: '(tabs)' };

function InnerLayout() {
  const { isDark } = useColors();
  const router = useRouter();
  const tapListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Canales de Android + handler de foreground
    createNotificationChannels();
    setupForegroundHandler();

    // Navegación al tocar una notificación
    tapListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (!data) return;
      try {
        if (data.type === 'room_message' || data.type === 'journey_photo') {
          const roomId = data.challenge_id ?? data.room_id;
          if (roomId) {
            router.push(`/screens/RoomDetailScreen?id=${roomId}` as never);
          }
        }
      } catch {}
    });

    return () => {
      tapListenerRef.current?.remove();
    };
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="onboarding"                  options={{ headerShown: false }} />
        <Stack.Screen name="login"                       options={{ headerShown: false }} />
        <Stack.Screen name="register"                    options={{ headerShown: false }} />
        <Stack.Screen name="home"                        options={{ headerShown: false }} />
        <Stack.Screen name="personalizado"               options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"                      options={{ headerShown: false }} />
        <Stack.Screen name="screens/SettingsScreen"      options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="screens/EditProfileScreen"   options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="screens/SecurityScreen"      options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="screens/RoomDetailScreen"       options={{ headerShown: false }} />
        <Stack.Screen name="screens/CreateChallengeScreen" options={{ headerShown: false }} />
        <Stack.Screen name="screens/JoinChallengeScreen"   options={{ headerShown: false }} />
        <Stack.Screen name="screens/ScanQRScreen"          options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <MugenThemeProvider>
      <InnerLayout />
    </MugenThemeProvider>
  );
}
