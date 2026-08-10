import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';

// ── Canal de Android ───────────────────────────────────────────────────────────
export async function createNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('mugen-messages', {
    name: 'Mensajes de sala',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#FF0066',
    sound: 'default',
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('mugen-social', {
    name: 'Actividad de compañeros',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200],
    lightColor: '#FF0066',
    sound: 'default',
    showBadge: true,
  });
}

// ── Manejador de foreground ────────────────────────────────────────────────────
export function setupForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ── Solicitar permiso y obtener token ─────────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  // Push remoto no está soportado en Expo Go (SDK 53+). Evita el warning.
  if (isRunningInExpoGo()) {
    console.log('[Push] En Expo Go: push remoto no disponible, se omite.');
    return null;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permiso denegado');
      return null;
    }

    // Obtener Expo Push Token — requiere EAS projectId en producción
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('[Push] Sin projectId (EAS). Usando FCM token de dispositivo...');
      // Fallback: token nativo del dispositivo (FCM en Android)
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      console.log('[Push] Device token:', deviceToken.data?.slice(0, 20) + '...');
      return deviceToken.data ?? null;
    }

    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Expo token:', pushToken.data.slice(0, 30) + '...');
    return pushToken.data;
  } catch (e) {
    console.log('[Push] Error al obtener token:', e);
    return null;
  }
}

// ── Listener: tap en notificación → navegar a la pantalla correcta ────────────
export function useNotificationNavigation() {
  const router = useRouter();

  const handleTap = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as any;
    if (!data) return;

    try {
      if (data.type === 'room_message' || data.type === 'journey_photo') {
        const roomId = data.challenge_id ?? data.room_id;
        if (roomId) {
          router.push(`/screens/RoomDetailScreen?id=${roomId}` as never);
        }
      }
    } catch (e) {
      console.log('[Push] Nav error:', e);
    }
  };

  return handleTap;
}
