import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, SafeAreaView,
  Image, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storage } from '../../services/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { inviteApi } from '../../services/api';
import { useColors } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function JoinChallengeScreen() {
  const { C } = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState((params.code ?? '').toUpperCase());
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const search = async () => {
    if (code.length < 4) return;
    setLoading(true);
    setChallenge(null);
    try {
      const { data } = await inviteApi.findByCode(code);
      setChallenge(data.challenge);
    } catch {
      Alert.alert(t('join.notFoundTitle'), t('join.notFoundMsg'));
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    const token = await storage.get('token');
    if (!token) {
      await storage.set('pending_invite_code', code);
      router.replace('/register');
      return;
    }

    setJoining(true);
    try {
      const res = await inviteApi.join(code, token);
      if (res.data?.pending) {
        Alert.alert(t('join.requestSentTitle'), t('join.requestSentMsg'), [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      Alert.alert(t('join.welcomeTitle'), t('join.welcomeMsg', { name: challenge.name }), [
        { text: t('join.seeRoom'), onPress: () => router.replace('/(tabs)' as any) },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? t('join.joinError');
      Alert.alert(t('common.error'), msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>{t('join.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.body}>
        <Text style={[s.label, { color: C.textMuted }]}>{t('join.codeLabel')}</Text>

        {/* Input */}
        <View style={[s.inputRow, { backgroundColor: C.card, borderColor: C.border }]}>
          <MaterialCommunityIcons name="pound" size={20} color={C.mugenPink} />
          <TextInput
            style={[s.input, { color: C.textPrimary }]}
            placeholder={t('join.codePlaceholder')}
            placeholderTextColor={C.textMuted}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
            returnKeyType="search"
            onSubmitEditing={search}
          />
          <TouchableOpacity onPress={search} disabled={loading || code.length < 4}>
            {loading
              ? <ActivityIndicator size="small" color={C.mugenPink} />
              : <MaterialCommunityIcons name="magnify" size={22} color={code.length >= 4 ? C.mugenPink : C.textMuted} />
            }
          </TouchableOpacity>
        </View>

        {/* Resultado */}
        {challenge && (
          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            {challenge.cover_image && (
              <Image
                source={{ uri: `http://192.168.0.5:8000/storage/${challenge.cover_image}` }}
                style={s.coverImage}
              />
            )}
            <View style={s.cardBody}>
              <View style={s.nameRow}>
                <Text style={[s.challengeName, { color: C.textPrimary }]}>{challenge.name}</Text>
                {challenge.is_private && (
                  <View style={[s.privacyBadge, { backgroundColor: C.mugenPink + '22' }]}>
                    <MaterialCommunityIcons name="lock" size={12} color={C.mugenPink} />
                    <Text style={[s.privacyBadgeText, { color: C.mugenPink }]}>{t('join.private')}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.challengeMeta, { color: C.textSecondary }]}>
                {t('join.createdBy', { name: challenge.user?.name, count: challenge.duration_days })}
              </Text>
              <Text style={[s.challengeMeta, { color: C.textMuted }]}>
                {t('join.memberCount', { count: challenge.members_count })}
              </Text>
            </View>

            <TouchableOpacity
              style={[s.joinBtn, { backgroundColor: C.mugenPink }]}
              onPress={join}
              disabled={joining}
              activeOpacity={0.85}
            >
              {joining
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.joinBtnText}>
                    {challenge.is_private ? t('join.requestJoin').toUpperCase() : t('join.joinRoom').toUpperCase()}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Divider */}
        <View style={[s.divider, { borderColor: C.border }]}>
          <Text style={[s.dividerText, { color: C.textMuted }]}>{t('join.orScan')}</Text>
        </View>

        <TouchableOpacity
          style={[s.qrBtn, { backgroundColor: C.elevated, borderColor: C.border }]}
          onPress={() => router.push('/screens/ScanQRScreen' as any)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={24} color={C.mugenPink} />
          <Text style={[s.qrBtnText, { color: C.textPrimary }]}>{t('join.scanQr')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  body:        { flex: 1, padding: 24 },
  label:       { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 16, borderWidth: 1, marginBottom: 24,
  },
  input:       { flex: 1, fontSize: 18, fontWeight: '700', letterSpacing: 3 },
  card:        { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  coverImage:  { width: '100%', height: 140 },
  cardBody:    { padding: 16 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  privacyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  privacyBadgeText: { fontSize: 11, fontWeight: '800' },
  challengeName: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  challengeMeta: { fontSize: 13, marginTop: 2 },
  joinBtn: {
    margin: 16, marginTop: 8, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  joinBtnText:  { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  divider:      { borderTopWidth: 1, alignItems: 'center', paddingTop: 24, marginBottom: 24 },
  dividerText:  { fontSize: 12, fontWeight: '600', marginTop: -10, paddingHorizontal: 12 },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    padding: 18, borderRadius: 16, borderWidth: 1,
  },
  qrBtnText:    { fontSize: 15, fontWeight: '700' },
});
