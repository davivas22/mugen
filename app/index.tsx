import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { storage } from '../services/storage';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await storage.get('token');
      console.log('[INDEX] token encontrado:', !!token, '→ redirigiendo a', token ? '/(tabs)' : '/onboarding');
      router.dismissAll();
      router.replace(token ? '/(tabs)' : '/onboarding');
      console.log('[INDEX] router.replace ejecutado');
    })();
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;
}
