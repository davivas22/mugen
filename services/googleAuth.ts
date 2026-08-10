import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_CONFIGURED } from './googleConfig';
import { authApi } from './api';
import { storage } from './storage';

WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInError = 'googleNotConfigured' | 'googleCancelled' | 'googleFailed' | 'googleNoToken' | 'server';

const persistSession = async (data: any) => {
  const token = data.token ?? data.access_token ?? '';
  const user = data.user ?? {};
  if (!token) throw new Error('No token received');
  try {
    await storage.set('token', token);
    await storage.set('user', JSON.stringify(user));
  } catch (e) {
    console.warn('SecureStore error:', e);
  }
};

export const useGoogleSignIn = () => {
  const [request, , promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID.clientId,
    webClientId: GOOGLE_CLIENT_ID.webClientId,
    androidClientId: GOOGLE_CLIENT_ID.androidClientId,
    iosClientId: GOOGLE_CLIENT_ID.iosClientId,
  });

  const [processing, setProcessing] = useState(false);

  const signIn = async (): Promise<{ ok: boolean; error?: GoogleSignInError }> => {
    if (!GOOGLE_CONFIGURED) return { ok: false, error: 'googleNotConfigured' };
    if (!request) return { ok: false, error: 'googleFailed' };

    setProcessing(true);
    try {
      const result = await promptAsync();
      if (result?.type !== 'success') {
        return { ok: false, error: result?.type === 'cancel' ? 'googleCancelled' : 'googleFailed' };
      }
      const idToken = result.authentication?.idToken;
      if (!idToken) return { ok: false, error: 'googleNoToken' };

      try {
        const res = await authApi.google(idToken);
        await persistSession(res.data);
        return { ok: true };
      } catch (e) {
        console.warn('Google server login failed:', e);
        return { ok: false, error: 'server' };
      }
    } catch (e) {
      console.warn('Google sign-in failed:', e);
      return { ok: false, error: 'googleFailed' };
    } finally {
      setProcessing(false);
    }
  };

  return { signIn, processing, configured: GOOGLE_CONFIGURED };
};

export { persistSession };