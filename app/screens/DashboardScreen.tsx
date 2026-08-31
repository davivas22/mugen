import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Image, Platform, Pressable,
  ScrollView, StatusBar, StyleSheet, Text, View, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '../context/ThemeContext';
import { userApi, challengeApi, messageApi, feedApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';
import { registerForPushNotifications } from '../../services/notifications';
import { useTranslation } from 'react-i18next';

const ACCENT   = '#FF0066';
const { width: W } = Dimensions.get('window');
const CARD_W   = W * 0.68;

type Challenge = { id: number; name: string; invite_code: string; members_count: number; active: boolean };
type FeedItem  = { type: string; user_name: string; user_avatar: string | null; challenge_name: string; photo_path: string | null; event_date: string; text: string };
type InboxMsg  = { id: number; challenge_id: number; challenge_name: string; sender_name: string; content: string };

// ─── Animated value helpers ──────────────────────────────────────────────────
function useEntrance(delay = 0) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ─── Room card ────────────────────────────────────────────────────────────────
function RoomCard({ ch, onPress }: { ch: Challenge; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,    friction: 5, useNativeDriver: true }),
    ]).start(onPress);
  };
  const colors = ch.active
    ? ['#1a0a2e', '#2d0f5e'] as const
    : ['#111111', '#1a1a1a'] as const;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={press}>
        <LinearGradient colors={colors} style={s.roomCard}>
          <View style={s.roomCardTop}>
            <View style={[s.roomInitial, { backgroundColor: ch.active ? ACCENT + '22' : '#ffffff10' }]}>
              <Text style={[s.roomInitialTxt, { color: ch.active ? ACCENT : '#fff' }]}>
                {ch.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            {ch.active && (
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.liveTxt}>ACTIVA</Text>
              </View>
            )}
          </View>
          <Text style={s.roomName} numberOfLines={2}>{ch.name}</Text>
          <View style={s.roomFooter}>
            <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={s.roomMembers}>{ch.members_count} miembros</Text>
            <Ionicons name="chevron-forward" size={14} color={ch.active ? ACCENT : 'rgba(255,255,255,0.3)'} style={{ marginLeft: 'auto' }} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Quick action button ───────────────────────────────────────────────────────
function ActionBtn({ icon, label, onPress, color = ACCENT }: {
  icon: string; label: string; onPress: () => void; color?: string;
}) {
  const { C } = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,    friction: 5, useNativeDriver: true }),
    ]).start(onPress);
  };
  return (
    <Animated.View style={[s.actionBtn, { backgroundColor: C.card, transform: [{ scale }] }]}>
      <Pressable onPress={press} style={s.actionBtnInner}>
        <View style={[s.actionIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={[s.actionLabel, { color: C.textPrimary }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Feed item ────────────────────────────────────────────────────────────────
function FeedCard({ item }: { item: FeedItem }) {
  const { C } = useColors();
  const url     = item.user_avatar ? getStorageUrl(item.user_avatar) : null;
  const initial = item.user_name?.charAt(0)?.toUpperCase() ?? '?';
  const isPhoto = item.type === 'journey_photo' || item.type === 'photo';
  const date    = new Date(item.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <View style={[s.feedCard, { backgroundColor: C.card }]}>
      <View style={s.feedTop}>
        {url ? (
          <Image source={{ uri: url }} style={s.feedAvatar} />
        ) : (
          <View style={[s.feedAvatar, { backgroundColor: ACCENT + '22', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 15 }}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.feedName, { color: C.textPrimary }]} numberOfLines={1}>{item.user_name}</Text>
          <Text style={[s.feedMeta, { color: C.textSecondary }]}>{item.challenge_name} · {date}</Text>
        </View>
        <View style={[s.feedTypePill, { backgroundColor: isPhoto ? '#6B35FF22' : ACCENT + '18' }]}>
          <Ionicons
            name={isPhoto ? 'camera-outline' : 'barbell-outline'}
            size={12}
            color={isPhoto ? '#6B35FF' : ACCENT}
          />
        </View>
      </View>
      <Text style={[s.feedText, { color: C.textSecondary }]} numberOfLines={3}>{item.text}</Text>
      {isPhoto && item.photo_path && (
        <Image
          source={{ uri: getStorageUrl(item.photo_path) ?? undefined }}
          style={s.feedPhoto}
        />
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { C, isDark, toggle } = useColors();
  const { t } = useTranslation();

  const [userName,    setUserName]    = useState('Usuario');
  const [avatarUri,   setAvatarUri]   = useState<string | null>(null);
  const [streak,      setStreak]      = useState(0);
  const [challenges,  setChallenges]  = useState<Challenge[]>([]);
  const [feedItems,   setFeedItems]   = useState<FeedItem[]>([]);
  const [inboxMsgs,   setInboxMsgs]   = useState<InboxMsg[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [token,       setToken]       = useState('');

  // Entrance animations
  const headerAnim  = useEntrance(0);
  const heroAnim    = useEntrance(100);
  const roomsAnim   = useEntrance(200);
  const actionsAnim = useEntrance(300);
  const feedAnim    = useEntrance(400);

  // Banner animation
  const bannerY = useRef(new Animated.Value(-80)).current;
  const [bannerVisible, setBannerVisible] = useState(false);

  const showBanner = () => {
    setBannerVisible(true);
    Animated.spring(bannerY, { toValue: 0, friction: 8, useNativeDriver: true }).start();
  };
  const dismissBanner = async () => {
    Animated.timing(bannerY, { toValue: -80, duration: 200, useNativeDriver: true }).start(() => setBannerVisible(false));
    try { await messageApi.markAllRead(token); } catch {}
    setInboxMsgs([]);
  };

  const loadData = useCallback(async (tkn: string) => {
    try {
      const [statsRes, challengesRes, inboxRes, feedRes] = await Promise.all([
        userApi.stats(tkn),
        userApi.myChallenges(tkn),
        messageApi.inbox(tkn),
        feedApi.get(tkn),
      ]);

      setStreak(statsRes.data.streak ?? 0);

      const chs: Challenge[] = (challengesRes.data.challenges ?? []).map((c: any) => {
        const now   = new Date();
        const start = new Date(c.start_date);
        const end   = new Date(start);
        end.setDate(end.getDate() + (c.duration_days ?? 30));
        return {
          id:            c.id,
          name:          c.name,
          invite_code:   c.invite_code,
          members_count: c.members_count ?? 0,
          active:        now >= start && now <= end,
        };
      });
      setChallenges(chs);

      const msgs: InboxMsg[] = inboxRes.data.messages ?? [];
      if (msgs.length > 0) { setInboxMsgs(msgs); showBanner(); }

      setFeedItems(feedRes.data.feed ?? []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const [tkn, userRaw, localAvatar] = await Promise.all([
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
      if (tkn) {
        setToken(tkn);
        await loadData(tkn);
        registerForPushNotifications().then(pt => {
          if (pt) userApi.savePushToken(pt, tkn).catch(() => {});
        });
      } else {
        setLoading(false);
      }
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [tkn, userRaw, localAvatar] = await Promise.all([
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
      if (tkn) { setToken(tkn); loadData(tkn); }
    })();
  }, [loadData]));

  const firstName = userName.split(' ')[0];
  const todayDay  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date().getDay()];
  const today     = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const scrollPad = 100 + Math.max(insets.bottom, 8);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── NOTIFICATION BANNER ────────────────────────────────────── */}
      {bannerVisible && inboxMsgs.length > 0 && (
        <Animated.View style={[s.banner, { top: insets.top + 8, transform: [{ translateY: bannerY }] }]}>
          <LinearGradient colors={['#1a0028', '#2d0050']} style={s.bannerGrad}>
            <View style={[s.bannerIcon, { backgroundColor: ACCENT }]}>
              <Ionicons name="chatbubble" size={14} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerFrom} numberOfLines={1}>
                {inboxMsgs[0].sender_name} · {inboxMsgs[0].challenge_name}
              </Text>
              <Text style={s.bannerText} numberOfLines={1}>{inboxMsgs[0].content}</Text>
            </View>
            {inboxMsgs.length > 1 && (
              <View style={s.bannerBadge}><Text style={s.bannerBadgeTxt}>+{inboxMsgs.length - 1}</Text></View>
            )}
            <Pressable onPress={dismissBanner} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </LinearGradient>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPad }}
      >
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <LinearGradient colors={['#000000', '#0a0010', C.bg]} style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Animated.View style={[s.headerRow, headerAnim]}>
            <Pressable style={s.headerLeft} onPress={() => router.push('/perfil' as never)}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.headerAvatar} />
              ) : (
                <View style={[s.headerAvatar, s.headerAvatarFallback]}>
                  <Text style={s.headerAvatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View>
                <Text style={s.greeting}>{t('dashboard.greeting')}</Text>
                <Text style={s.firstName}>{firstName}</Text>
              </View>
            </Pressable>

            <View style={s.headerRight}>
              <Pressable onPress={toggle} style={s.iconBtn}>
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <View style={s.streakBadge}>
                <MaterialCommunityIcons name="fire" size={18} color={ACCENT} />
                <Text style={s.streakNum}>{loading ? '–' : streak}</Text>
              </View>
            </View>
          </Animated.View>

          {/* HERO CARD ──── */}
          <Animated.View style={[{ marginTop: 20, marginHorizontal: 16 }, heroAnim]}>
            <LinearGradient
              colors={['#1a0030', '#2d0060', '#FF006622']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.heroCard}
            >
              <View style={s.heroCardLeft}>
                <Text style={s.heroDate}>{todayDay}, {today}</Text>
                <Text style={s.heroTitle}>Tu día{'\n'}en el gym</Text>
                <View style={s.heroStreakRow}>
                  <MaterialCommunityIcons name="fire" size={16} color={ACCENT} />
                  <Text style={s.heroStreakTxt}>
                    {streak > 0 ? `${streak} días seguidos` : 'Empieza hoy tu racha'}
                  </Text>
                </View>
              </View>
              <View style={s.heroCardRight}>
                <View style={s.heroRing}>
                  <Text style={s.heroRingNum}>{streak}</Text>
                  <Text style={s.heroRingLbl}>RACHA</Text>
                </View>
              </View>
              {/* Decorative circle */}
              <View style={s.heroCircleDeco} />
            </LinearGradient>
          </Animated.View>
        </LinearGradient>

        {/* ── MIS SALAS ─────────────────────────────────────────────── */}
        <Animated.View style={[{ marginTop: 28 }, roomsAnim]}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>MIS SALAS</Text>
            <Pressable onPress={() => router.push('/salas' as never)} style={s.seeAllBtn}>
              <Text style={[s.seeAllTxt, { color: ACCENT }]}>Ver todas</Text>
              <Ionicons name="chevron-forward" size={14} color={ACCENT} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginLeft: 16, marginTop: 8 }} />
          ) : challenges.length === 0 ? (
            <Pressable
              onPress={() => router.push('/salas' as never)}
              style={[s.emptyRoomsCard, { backgroundColor: C.card }]}
            >
              <LinearGradient colors={['#1a001a', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="add-circle-outline" size={36} color={ACCENT} />
              <Text style={s.emptyRoomsTxt}>Únete a tu primera sala</Text>
              <Text style={s.emptyRoomsSub}>Crea o únete a un desafío con amigos</Text>
            </Pressable>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.roomsScroll}
              decelerationRate="fast"
              snapToInterval={CARD_W + 12}
            >
              {challenges.map(ch => (
                <RoomCard
                  key={ch.id}
                  ch={ch}
                  onPress={() => router.push(`/screens/RoomDetailScreen?id=${ch.id}` as never)}
                />
              ))}
              {/* Add room card */}
              <Pressable
                onPress={() => router.push('/salas' as never)}
                style={[s.addRoomCard, { backgroundColor: C.card }]}
              >
                <View style={[s.addRoomIcon, { backgroundColor: ACCENT + '18' }]}>
                  <Ionicons name="add" size={28} color={ACCENT} />
                </View>
                <Text style={[s.addRoomTxt, { color: C.textSecondary }]}>Nueva{'\n'}sala</Text>
              </Pressable>
            </ScrollView>
          )}
        </Animated.View>

        {/* ── ACCIONES RÁPIDAS ────────────────────────────────────────── */}
        <Animated.View style={[{ marginTop: 28, marginHorizontal: 16 }, actionsAnim]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>ACCIONES RÁPIDAS</Text>
          <View style={s.actionsGrid}>
            <ActionBtn
              icon="qr-code-outline"
              label="Escanear QR"
              onPress={() => router.push('/screens/ScanQRScreen' as never)}
              color={ACCENT}
            />
            <ActionBtn
              icon="add-circle-outline"
              label="Crear sala"
              onPress={() => router.push('/salas' as never)}
              color="#6B35FF"
            />
            <ActionBtn
              icon="people-outline"
              label="Mis salas"
              onPress={() => router.push('/salas' as never)}
              color="#00C896"
            />
            <ActionBtn
              icon="person-outline"
              label="Mi perfil"
              onPress={() => router.push('/perfil' as never)}
              color="#FF9500"
            />
          </View>
        </Animated.View>

        {/* ── ACTIVIDAD RECIENTE ──────────────────────────────────────── */}
        {feedItems.length > 0 && (
          <Animated.View style={[{ marginTop: 28, marginHorizontal: 16 }, feedAnim]}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: C.textSecondary }]}>ACTIVIDAD RECIENTE</Text>
            </View>
            <View style={s.feedList}>
              {feedItems.slice(0, 6).map((item, i) => (
                <FeedCard key={`${item.type}-${i}`} item={item} />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Banner
  banner:      { position: 'absolute', zIndex: 99, left: 16, right: 16 },
  bannerGrad:  { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: ACCENT + '30' },
  bannerIcon:  { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bannerFrom:  { color: ACCENT, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  bannerText:  { color: '#fff', fontSize: 13, marginTop: 1 },
  bannerBadge: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  bannerBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Header
  header:      { paddingBottom: 24 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar:        { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: ACCENT },
  headerAvatarFallback:{ backgroundColor: ACCENT + '22', alignItems: 'center', justifyContent: 'center' },
  headerAvatarInitial: { color: ACCENT, fontSize: 18, fontWeight: '800' },
  greeting:    { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  firstName:   { color: '#fff', fontSize: 20, fontWeight: '800' },
  iconBtn:     { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT + '18', borderWidth: 1, borderColor: ACCENT + '40', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  streakNum:   { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Hero card
  heroCard:     { borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minHeight: 140, borderWidth: 1, borderColor: ACCENT + '25' },
  heroCardLeft: { flex: 1 },
  heroDate:     { color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  heroTitle:    { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 30, marginBottom: 10 },
  heroStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStreakTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroCardRight: { alignItems: 'center', justifyContent: 'center' },
  heroRing:     { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT + '12' },
  heroRingNum:  { color: '#fff', fontSize: 28, fontWeight: '900' },
  heroRingLbl:  { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  heroCircleDeco: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: 'rgba(255,0,102,0.12)', right: -60, top: -60 },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionLabel:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  seeAllBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllTxt:     { fontSize: 13, fontWeight: '600' },

  // Rooms
  roomsScroll: { paddingLeft: 16, paddingRight: 8, gap: 12 },
  roomCard:    { width: CARD_W, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', minHeight: 150 },
  roomCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  roomInitial: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roomInitialTxt: { fontSize: 20, fontWeight: '900' },
  livePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: ACCENT + '35' },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  liveTxt:     { color: ACCENT, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  roomName:    { color: '#fff', fontSize: 17, fontWeight: '800', lineHeight: 22, marginBottom: 'auto', flex: 1 },
  roomFooter:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  roomMembers: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  addRoomCard: { width: 100, borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', minHeight: 150 },
  addRoomIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addRoomTxt:  { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  emptyRoomsCard: { marginHorizontal: 16, borderRadius: 20, padding: 28, alignItems: 'center', gap: 8, overflow: 'hidden', borderWidth: 1, borderColor: ACCENT + '20', borderStyle: 'dashed' },
  emptyRoomsTxt:  { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  emptyRoomsSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' },

  // Quick actions grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn:   { width: (W - 32 - 10) / 2, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  actionBtnInner: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon:  { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', flex: 1 },

  // Feed
  feedList:  { gap: 10 },
  feedCard:  { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  feedTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  feedAvatar:   { width: 40, height: 40, borderRadius: 12 },
  feedName:     { fontSize: 14, fontWeight: '700' },
  feedMeta:     { fontSize: 11, marginTop: 1 },
  feedTypePill: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  feedText:     { fontSize: 13, lineHeight: 18 },
  feedPhoto:    { width: '100%', height: 150, borderRadius: 10, marginTop: 10 },
});
