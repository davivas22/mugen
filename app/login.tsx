import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { storage } from '../services/storage';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Pressable, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';

const ACCENT = '#FF0066';

export default function LoginScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t } = useTranslation();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const login = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), t('auth.fillAll'));
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login(email.trim(), password);
      const token = data.token ?? data.access_token ?? '';
      const user  = data.user ?? {};
      await storage.set('token', token);
      await storage.set('user', JSON.stringify(user));
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error?.response?.data?.message || t('auth.loginError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TouchableOpacity
        style={[s.backButton, { top: insets.top + 16 }]}
        onPress={() => router.replace('/onboarding')}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.card}>
          <Text style={s.title}>{t('auth.welcomeBack')}</Text>
          <Text style={s.subtitle}>{t('auth.loginSubtitle')}</Text>

          <View style={s.inputContainer}>
            <Ionicons name="mail" size={20} color={ACCENT} style={{ marginRight: 10 }} />
            <TextInput
              style={s.input}
              placeholder={t('auth.email')}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={ACCENT} style={{ marginRight: 10 }} />
            <TextInput
              style={s.input}
              placeholder={t('auth.password')}
              placeholderTextColor="#999"
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={login}
              returnKeyType="go"
            />
            <Pressable onPress={() => setShowPwd(p => !p)} hitSlop={10}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
            </Pressable>
          </View>

          <TouchableOpacity
            style={[s.button, loading && { opacity: 0.7 }]}
            onPress={login}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.buttonText}>{t('auth.loginCta')}</Text>}
          </TouchableOpacity>

          <Text style={s.registerText}>
            {t('auth.noAccount')}{' '}
            <Text style={s.registerLink} onPress={() => router.replace('/register')}>
              {t('auth.register')}
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  backButton: { position: 'absolute', left: 20, zIndex: 10 },

  card:     { width: '90%', padding: 25 },
  title:    { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#000' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 25, marginTop: 5 },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 12,
    paddingHorizontal: 15, marginBottom: 15,
  },
  input: { flex: 1, paddingVertical: 15, color: '#000', fontSize: 15 },

  button:     { backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  registerText: { textAlign: 'center', marginTop: 20, color: '#666' },
  registerLink: { color: ACCENT, fontWeight: 'bold' },
});
