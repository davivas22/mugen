import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Image, Pressable,
  ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStorageUrl, userApi, badgeApi } from '../../services/api';
import { storage } from '../../services/storage';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BG      = '#080808';
const CARD    = '#111111';
const CARD2   = '#171717';
const BORDER  = '#222222';
const ACCENT  = '#FF0066';
const TEXT    = '#ffffff';
const MUTED   = '#555555';
const SUB     = '#888888';

type Badge = {
  key: string; name: string; icon: string;
  description: string; earned: boolean; unlocked_at: string | null;
};

export default function ProfileScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [userName,  setUserName]  = useState('Usuario');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [streak,    setStreak]    = useState(0);
  const [badges,    setBadges]    = useState<Badge[]>([]);
  const [loading,   setLoading]   = useState(true);

  const fade = useRef(new Animated.Value(0)).current;

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
        setAvatarUri(localAvatar ?? getStorageUrl(u.avatar));
      } catch (_) {}
    }
    if (t) {
      try {
        const [statsRes, badgesRes] = await Promise.all([
          userApi.stats(t),
          badgeApi.get(t),
        ]);
        setStreak(statsRes.data.streak ?? 0);
        setBadges(badgesRes.data.badges ?? []);
      } catch (_) {}
    }
    setLoading(false);
    Animated.timing(fade, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fade.setValue(0);
    loadProfile();
  }, [loadProfile]));

  const earned    = badges.filter(b => b.earned).length;
  const firstName = userName.split(' ')[0];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <Text style={s.topBarTitle}>Perfil</Text>
        <Pressable
          onPress={() => navigation.navigate('screens/SettingsScreen')}
          style={s.iconBtn}
        >
          <Ionicons name="settings-outline" size={19} color={SUB} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View style={{ opacity: fade }}>

          {/* ── Avatar block ── */}
          <View style={s.avatarBlock}>
            <Pressable
              onPress={() => navigation.navigate('screens/EditProfileScreen')}
              style={s.avatarWrap}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Ionicons name="person" size={40} color={MUTED} />
                </View>
              )}
              <View style={s.editDot}>
                <Ionicons name="pencil" size={10} color="#fff" />
              </View>
            </Pressable>

            <Text style={s.name}>{firstName}</Text>
            {userName !== firstName && (
              <Text style={s.fullName}>{userName}</Text>
            )}

            <Pressable
              onPress={() => navigation.navigate('screens/EditProfileScreen')}
              style={s.editBtn}
            >
              <Text style={s.editBtnTxt}>Editar perfil</Text>
            </Pressable>
          </View>

          {/* ── Stats row ── */}
          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 32 }} />
          ) : (
            <View style={s.statsRow}>
              <StatCard
                icon="flame-outline"
                iconColor={ACCENT}
                value={String(streak)}
                label="RACHA"
                sub="días"
              />
              <View style={s.statDivider} />
              <StatCard
                icon="trophy-outline"
                iconColor="#F59E0B"
                value={`${earned}/${badges.length}`}
                label="LOGROS"
                sub="desbloqueados"
              />
            </View>
          )}

          {/* ── Logros ── */}
          {!loading && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Logros</Text>
                <Text style={s.sectionCount}>{earned} de {badges.length}</Text>
              </View>

              {badges.length === 0 ? (
                <View style={s.emptyState}>
                  <MaterialCommunityIcons name="trophy-outline" size={36} color={MUTED} />
                  <Text style={s.emptyTitle}>Sin logros aún</Text>
                  <Text style={s.emptySub}>Asiste al gym para desbloquear tus primeros logros</Text>
                </View>
              ) : (
                <View style={s.badgeGrid}>
                  {badges.map(b => <BadgeItem key={b.key} badge={b} />)}
                </View>
              )}
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, iconColor, value, label, sub }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string; value: string; label: string; sub: string;
}) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: iconColor + '14' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

// ─── Badge item ───────────────────────────────────────────────────────────────
function BadgeItem({ badge: b }: { badge: Badge }) {
  return (
    <View style={[s.badgeCard, !b.earned && s.badgeLocked]}>
      <View style={[s.badgeIconWrap, { backgroundColor: b.earned ? ACCENT + '14' : CARD2 }]}>
        <Ionicons
          name={b.icon as any}
          size={22}
          color={b.earned ? ACCENT : MUTED}
        />
      </View>
      <Text style={[s.badgeName, !b.earned && { color: MUTED }]} numberOfLines={2}>
        {b.name}
      </Text>
      {b.earned && b.unlocked_at && (
        <Text style={s.badgeDate}>{b.unlocked_at}</Text>
      )}
      {b.earned && (
        <View style={s.badgeDot} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Top bar
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  topBarTitle: { color: TEXT, fontSize: 17, fontWeight: '700' },
  iconBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },

  // Avatar block
  avatarBlock: { alignItems: 'center', paddingTop: 32, paddingBottom: 28 },
  avatarWrap:  { position: 'relative', marginBottom: 16 },
  avatar:      { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: BORDER },
  avatarFallback:{ backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  editDot:     { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BG },
  name:        { color: TEXT, fontSize: 26, fontWeight: '800', letterSpacing: 0.3, marginBottom: 2 },
  fullName:    { color: SUB, fontSize: 14, marginBottom: 16 },
  editBtn:     { borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  editBtnTxt:  { color: SUB, fontSize: 13, fontWeight: '600' },

  // Stats
  statsRow:     { flexDirection: 'row', marginHorizontal: 20, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 28 },
  statCard:     { flex: 1, alignItems: 'center', paddingVertical: 20, gap: 3 },
  statDivider:  { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 14 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue:    { color: TEXT, fontSize: 26, fontWeight: '900' },
  statLabel:    { color: MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },
  statSub:      { color: MUTED, fontSize: 11 },

  // Section
  section:       { marginHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle:  { color: TEXT, fontSize: 18, fontWeight: '800' },
  sectionCount:  { color: MUTED, fontSize: 13 },

  // Empty
  emptyState: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { color: SUB, fontSize: 15, fontWeight: '700' },
  emptySub:   { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Badge grid
  badgeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard:    {
    width: '30.5%', aspectRatio: 0.9,
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 10, position: 'relative',
  },
  badgeLocked:  { opacity: 0.35 },
  badgeIconWrap:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeName:    { color: TEXT, fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  badgeDate:    { color: MUTED, fontSize: 8, fontWeight: '600' },
  badgeDot:     { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
});
