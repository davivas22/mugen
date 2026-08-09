import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, StyleSheet, View, Text, ScrollView,
  TouchableOpacity, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../context/ThemeContext';
import { getStorageUrl, userApi, badgeApi } from '../../services/api';
import { storage } from '../../services/storage';

const ACCENT = '#FF0066';
const HORIZONTAL_MARGIN = 16;

type Stats = { streak: number; points: number };
type Badge = { key: string; name: string; icon: string; description: string; earned: boolean; unlocked_at: string | null };

function getRank(points: number) {
  if (points >= 1500) return 'Guerrero Elite';
  if (points >= 500)  return 'Campeón';
  if (points >= 150)  return 'Guerrero';
  if (points >= 50)   return 'Iniciado';
  return 'Novato';
}

function getLevel(points: number) {
  return Math.max(1, Math.floor(points / 50) + 1);
}

const cardShadow = Platform.select({
  ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { C } = useColors();

  const [userName, setUserName]   = useState('Usuario');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [stats, setStats]         = useState<Stats>({ streak: 0, points: 0 });
  const [badges, setBadges]       = useState<Badge[]>([]);
  const [loading, setLoading]     = useState(true);

  const loadProfile = useCallback(async () => {
    const [t, userRaw, localAvatar] = await Promise.all([
      storage.get('token'),
      storage.get('user'),
      storage.get('avatar_local'),
    ]);

    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        setUserName(u.name ?? 'Usuario');
        if (localAvatar) {
          setAvatarUri(localAvatar);
        } else {
          setAvatarUri(getStorageUrl(u.avatar));
        }
      } catch (_) {}
    }

    if (t) {
      try {
        const [statsRes, badgesRes] = await Promise.all([
          userApi.stats(t),
          badgeApi.get(t),
        ]);
        setStats({
          streak: statsRes.data.streak ?? 0,
          points: statsRes.data.points ?? 0,
        });
        setBadges(badgesRes.data.badges ?? []);
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadProfile();
  }, [loadProfile]));

  const level     = getLevel(stats.points);
  const xpPercent = Math.min(100, (stats.points % 50) * 2);
  const rank      = getRank(stats.points);
  const earned    = badges.filter(b => b.earned).length;

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* HERO */}
        <View style={[s.hero, { backgroundColor: C.card, paddingTop: insets.top + 8 }]}>
          <View style={s.topBar}>
            <Text style={[s.screenTitle, { color: C.textPrimary }]}>Mi Perfil</Text>
            <TouchableOpacity onPress={() => navigation.navigate('screens/SettingsScreen')} style={[s.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}>
              <Ionicons name="settings-outline" size={22} color={C.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={s.avatarSection}>
            <TouchableOpacity onPress={() => navigation.navigate('screens/EditProfileScreen')} activeOpacity={0.85}>
              <View style={[s.avatarRing, { borderColor: C.mugenPink + '55' }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                ) : (
                  <View style={[s.avatarImg, { backgroundColor: C.elevated }]}>
                    <Ionicons name="person" size={40} color={C.mugenPink} />
                  </View>
                )}
              </View>
              <View style={[s.editBtn, { backgroundColor: C.mugenPink }]}>
                <Ionicons name="pencil" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[s.userName, { color: C.textPrimary }]}>{userName}</Text>
          <View style={[s.rankBadge, { backgroundColor: C.mugenPink + '20' }]}>
            <Ionicons name="shield-checkmark" size={14} color={C.mugenPink} />
            <Text style={[s.rankBadgeText, { color: C.mugenPink }]}>{rank} · Nv.{level}</Text>
          </View>

          <View style={s.xpSection}>
            <View style={s.xpLabelRow}>
              <Text style={[s.xpLabel, { color: C.textSecondary }]}>XP hacia nivel {level + 1}</Text>
              <Text style={[s.xpPct, { color: C.mugenPink }]}>{xpPercent}%</Text>
            </View>
            <View style={[s.xpBar, { backgroundColor: C.elevated }]}>
              <LinearGradient
                colors={[C.mugenPink, '#FF6B35']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.xpFill, { width: `${xpPercent}%` }]}
              />
            </View>
          </View>
        </View>

        {/* STATS */}
        {loading ? (
          <ActivityIndicator color={C.mugenPink} style={{ marginTop: 24 }} />
        ) : (
          <View style={s.statsRow}>
            <View style={[s.statCard, cardShadow, { backgroundColor: C.card }]}>
              <Ionicons name="flame-outline" size={22} color={ACCENT} />
              <Text style={[s.statVal, { color: C.textPrimary }]}>{stats.streak}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>RACHA</Text>
            </View>
            <View style={[s.statCard, cardShadow, { backgroundColor: C.card }]}>
              <Ionicons name="trophy-outline" size={22} color={ACCENT} />
              <Text style={[s.statVal, { color: C.textPrimary }]}>{stats.points}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>PUNTOS</Text>
            </View>
            <View style={[s.statCard, cardShadow, { backgroundColor: C.card }]}>
              <Ionicons name="star-outline" size={22} color={ACCENT} />
              <Text style={[s.statVal, { color: C.textPrimary }]}>{level}</Text>
              <Text style={[s.statLabel, { color: C.textSecondary }]}>NIVEL</Text>
            </View>
          </View>
        )}

        {/* LOGROS */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>LOGROS</Text>
            <Text style={[s.seeAll, { color: C.mugenPink }]}>
              {badges.filter(b => b.earned).length}/{badges.length}
            </Text>
          </View>
          <View style={s.grid}>
            {badges.map((b: Badge) => (
              <View key={b.key} style={[s.badge, { backgroundColor: C.card, borderColor: b.earned ? C.mugenPink + '35' : C.border, opacity: b.earned ? 1 : 0.35 }, cardShadow]}>
                <Ionicons name={b.icon as any} size={26} color={b.earned ? C.mugenPink : C.textSecondary} />
                <Text style={[s.badgeLabel, { color: C.textSecondary }]}>{b.name}</Text>
                {b.earned && b.unlocked_at ? (
                  <Text style={{ fontSize: 8, color: C.mugenPink, fontWeight: '700' }}>{b.unlocked_at}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { paddingBottom: 24 },
  hero:          { paddingBottom: 24, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: HORIZONTAL_MARGIN, marginBottom: 20 },
  screenTitle:   { fontSize: 22, fontWeight: '900' },
  iconBtn:       { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  avatarSection: { position: 'relative', marginBottom: 14 },
  avatarRing:    { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarImg:     { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  editBtn:       { position: 'absolute', bottom: 2, right: 0, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  userName:      { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  rankBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, gap: 6, marginBottom: 18 },
  rankBadgeText: { fontWeight: '800', fontSize: 12 },
  xpSection:     { width: '100%', paddingHorizontal: HORIZONTAL_MARGIN },
  xpLabelRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel:       { fontSize: 11, fontWeight: '600' },
  xpPct:         { fontSize: 11, fontWeight: '800' },
  xpBar:         { height: 6, borderRadius: 4, overflow: 'hidden' },
  xpFill:        { height: '100%', borderRadius: 4 },
  statsRow:      { flexDirection: 'row', paddingHorizontal: HORIZONTAL_MARGIN, marginTop: 20, gap: 10 },
  statCard:      { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 5 },
  statVal:       { fontSize: 22, fontWeight: '900' },
  statLabel:     { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  section:       { marginHorizontal: HORIZONTAL_MARGIN, marginTop: 20 },
  sectionLabel:  { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll:        { fontSize: 13, fontWeight: '700' },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  badge:         { width: '30.5%', aspectRatio: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, gap: 6 },
  badgeLabel:    { fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
