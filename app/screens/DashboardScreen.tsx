import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useFonts,
  BarlowCondensed_400Regular,
  BarlowCondensed_700Bold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import { useColors } from '../context/ThemeContext';
import { userApi, challengeApi, messageApi, feedApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';
import { registerForPushNotifications } from '../../services/notifications';
import { useTranslation } from 'react-i18next';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = '#FF0066';
const BOTTOM_NAV_HEIGHT = 60;
const HM = 16;
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Types ────────────────────────────────────────────────────────────────────
type UserStats = {
  streak: number;
  points: number;
};

type InboxMessage = {
  id: number;
  challenge_id: number;
  challenge_name: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
};

type FeedItem = {
  type: 'attendance' | 'journey_photo';
  user_name: string;
  user_avatar: string | null;
  challenge_name: string;
  photo_path: string | null;
  photo_id: number | null;
  event_date: string;
  text: string;
};

type Challenge = {
  id: number;
  name: string;
  invite_code: string;
  members_count: number;
};

type RoomMember = {
  id: number;
  username: string;
  avatar_url: string | null;
  points: number;
  sessions: number;
};

type IoniconName = keyof typeof Ionicons.glyphMap;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  android: { elevation: 3 },
  default: {},
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { isDark, toggle } = useColors();
  const { t } = useTranslation();

  const [fontsLoaded] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_700Bold,
    BarlowCondensed_900Black,
  });

  // ── Data state ──────────────────────────────────────────────────────────────
  const [userName,          setUserName]          = useState('Usuario');
  const [avatarUri,         setAvatarUri]         = useState<string | null>(null);
  const [userStats,         setUserStats]         = useState<UserStats>({ streak: 0, points: 0 });
  const [challenges,        setChallenges]        = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [roomMembers,       setRoomMembers]       = useState<RoomMember[]>([]);
  const [membersLoading,    setMembersLoading]    = useState(false);
  const [loading,           setLoading]           = useState(true);
  const [token,             setToken]             = useState('');

  // ── Social state ────────────────────────────────────────────────────────────
  const [inboxMessages,   setInboxMessages]   = useState<InboxMessage[]>([]);
  const [bannerVisible,   setBannerVisible]   = useState(false);
  const [feedItems,       setFeedItems]       = useState<FeedItem[]>([]);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  // ── Select a room and load its members ──────────────────────────────────────
  const selectRoom = async (challenge: Challenge, tkn: string) => {
    if (selectedChallenge?.id === challenge.id) return;
    setSelectedChallenge(challenge);
    setMembersLoading(true);
    try {
      const res = await challengeApi.leaderboard(challenge.id, 'semana', tkn || token);
      setRoomMembers(res.data.participants ?? []);
    } catch {
      setRoomMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  // ── Show/hide banner ────────────────────────────────────────────────────────
  const showBanner = () => {
    setBannerVisible(true);
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
  };

  const dismissBanner = async (tkn: string) => {
    Animated.timing(bannerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(async () => {
      setBannerVisible(false);
    });
    try { await messageApi.markAllRead(tkn); } catch {}
    setInboxMessages([]);
  };

  // ── Load social data ─────────────────────────────────────────────────────────
  const loadSocial = async (tkn: string) => {
    try {
      const [inboxRes, feedRes] = await Promise.all([
        messageApi.inbox(tkn),
        feedApi.get(tkn),
      ]);
      const msgs: InboxMessage[] = inboxRes.data.messages ?? [];
      setInboxMessages(msgs);
      if (msgs.length > 0) showBanner();
      setFeedItems(feedRes.data.feed ?? []);
    } catch {}
  };

  // ── Load stats/challenges data ──────────────────────────────────────────────
  const loadData = async (tkn?: string) => {
    const t = tkn ?? token;
    if (!t) return;
    try {
      const [statsRes, challengesRes] = await Promise.all([
        userApi.stats(t),
        userApi.myChallenges(t),
      ]);

      setUserStats({ streak: statsRes.data.streak ?? 0, points: statsRes.data.points ?? 0 });

      const chs: Challenge[] = (challengesRes.data.challenges ?? []).map((c: any) => ({
        id:            c.id,
        name:          c.name,
        invite_code:   c.invite_code,
        members_count: c.members_count ?? 0,
      }));
      setChallenges(chs);

      if (chs.length > 0) {
        setSelectedChallenge(chs[0]);
        setMembersLoading(true);
        try {
          const membRes = await challengeApi.leaderboard(chs[0].id, 'semana', t);
          setRoomMembers(membRes.data.participants ?? []);
        } catch {
          setRoomMembers([]);
        } finally {
          setMembersLoading(false);
        }
      }
    } catch (_) {}
  };

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [t, userRaw, localAvatar] = await Promise.all([
        storage.get('token'),
        storage.get('user'),
        storage.get('avatar_local'),
      ]);
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          setUserName(u.name ?? 'Usuario');
          if (localAvatar)   setAvatarUri(localAvatar);
          else if (u.avatar) setAvatarUri(getStorageUrl(u.avatar));
        } catch (_) {}
      }
      if (t) {
        setToken(t);
        await Promise.all([loadData(t), loadSocial(t)]);
        // Registrar token de push en background (no bloquea la carga)
        registerForPushNotifications().then(pushToken => {
          if (pushToken) userApi.savePushToken(pushToken, t).catch(() => {});
        });
      }
      setLoading(false);
    })();
  }, []);

  // ── Refresh todo al volver al foco (avatar, nombre y stats con streak) ───────
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [t, userRaw, localAvatar] = await Promise.all([
          storage.get('token'),
          storage.get('user'),
          storage.get('avatar_local'),
        ]);
        if (userRaw) {
          try {
            const u = JSON.parse(userRaw);
            setUserName(u.name ?? 'Usuario');
            if (localAvatar)   setAvatarUri(localAvatar);
            else if (u.avatar) setAvatarUri(getStorageUrl(u.avatar));
            else               setAvatarUri(null);
          } catch (_) {}
        }
        if (t) {
          loadData(t);
          loadSocial(t);
        }
      })();
    }, [])
  );

  // ── Font helper ─────────────────────────────────────────────────────────────
  const bf = (weight: '400' | '700' | '900') => {
    if (!fontsLoaded) return { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }), fontWeight: weight === '400' ? '400' as const : '700' as const };
    if (weight === '900') return { fontFamily: 'BarlowCondensed_900Black' };
    if (weight === '700') return { fontFamily: 'BarlowCondensed_700Bold' };
    return { fontFamily: 'BarlowCondensed_400Regular' };
  };

  // ── Date calculations ────────────────────────────────────────────────────────
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const weekStart  = new Date().getDate() - todayIndex;
  const scrollPad  = BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 8) + 24;
  const firstName  = userName.split(' ')[0];

  // ── Theme colors ─────────────────────────────────────────────────────────────
  const C = {
    headerBg: isDark ? '#000000' : '#0a0a0a',
    bodyBg:   isDark ? '#080810' : '#f5f5f7',
    cardBg:   isDark ? '#12121E' : '#ffffff',
    text:     isDark ? '#FFFFFF' : '#0a0a0a',
    textSub:  isDark ? 'rgba(255,255,255,0.5)'  : '#888888',
    border:   isDark ? 'rgba(255,255,255,0.07)' : '#f0f0f0',
    roomIdle: isDark ? 'rgba(255,255,255,0.07)' : '#f0f0f2',
    accentFg: `rgba(255,0,102,0.12)`,
  };

  // ─── Quick action buttons ───────────────────────────────────────────────────
  const ACTIONS: { icon: IoniconName; label: string; onPress: () => void }[] = [
    { icon: 'qr-code-outline',    label: t('dashboard.actions.scanQr'),      onPress: () => router.push('/screens/ScanQRScreen' as never) },
    { icon: 'trophy-outline',     label: t('dashboard.actions.leaderboard'), onPress: () => router.push('/ranking' as never) },
    { icon: 'add-circle-outline', label: t('dashboard.actions.newRoom'),     onPress: () => router.push('/salas' as never) },
    { icon: 'people-outline',     label: t('dashboard.actions.myRooms'),     onPress: () => router.push('/salas' as never) },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.bodyBg }}>
      <StatusBar style="light" backgroundColor={C.headerBg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPad }}
        style={{ flex: 1, backgroundColor: C.bodyBg }}
      >
        {/* ══════════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.header, { backgroundColor: C.headerBg, paddingTop: insets.top + 14 }]}>

          <View style={s.headerRow}>
            <Pressable style={s.headerLeft} onPress={() => router.push('/perfil' as never)}>
              <View style={s.avatarRing}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={s.avatarImg}
                    onError={() => setAvatarUri(null)}
                  />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View>
                <Text style={s.hiLabel}>{t('dashboard.greeting')}</Text>
                <Text style={[s.hiName, bf('700')]}>{firstName}</Text>
              </View>
            </Pressable>

            <View style={s.headerRight}>
              <Pressable
                onPress={toggle}
                style={[s.iconCircle, { borderColor: 'rgba(255,255,255,0.2)' }]}
              >
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={17} color="#fff" />
              </Pressable>

              <View style={[s.streakPill, { borderColor: 'rgba(255,0,102,0.5)' }]}>
                <MaterialCommunityIcons name="fire" size={16} color={ACCENT} />
                <Text style={[s.streakNum, bf('700')]}>
                  {loading ? '–' : userStats.streak}
                </Text>
              </View>
            </View>
          </View>

          <Pressable onPress={() => router.push('/ranking' as never)} style={{ marginTop: 8 }}>
            <Text style={s.rankLink}>{t('dashboard.weeklyRanking')}</Text>
          </Pressable>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            BODY
        ══════════════════════════════════════════════════════════════════ */}
        <View style={[s.body, { backgroundColor: C.bodyBg }]}>

          {/* ── BANNER MENSAJES ─────────────────────────────────────────── */}
          {bannerVisible && inboxMessages.length > 0 && (
            <Animated.View style={[s.msgBanner, {
              opacity: bannerAnim,
              transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            }]}>
              <View style={s.msgBannerLeft}>
                <View style={s.msgBannerIcon}>
                  <MaterialCommunityIcons name="message-text" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.msgBannerFrom} numberOfLines={1}>
                    {inboxMessages[0].sender_name} · {inboxMessages[0].challenge_name}
                  </Text>
                  <Text style={s.msgBannerText} numberOfLines={2}>
                    {inboxMessages[0].content}
                  </Text>
                  {inboxMessages.length > 1 && (
                    <Text style={s.msgBannerMore}>+{inboxMessages.length - 1} más sin leer</Text>
                  )}
                </View>
              </View>
              <Pressable onPress={() => dismissBanner(token)} style={s.msgBannerClose} hitSlop={10}>
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </Animated.View>
          )}

          {/* ── CALENDARIO ─────────────────────────────────────────────── */}
          <Text style={[s.sectionLabel, { color: C.textSub }]}>{t('dashboard.thisWeek')}</Text>
          <View style={[s.calCard, cardShadow, { backgroundColor: C.cardBg }]}>
            <View style={s.calRow}>
              {DAYS.map((day, i) => {
                const isToday = i === todayIndex;
                const dayNum  = weekStart + i;
                return (
                  <View key={day} style={s.dayCol}>
                    <Text style={[s.dayName, { color: isToday ? ACCENT : C.textSub }]}>{day}</Text>
                    {isToday ? (
                      <View style={[s.activeDot, { backgroundColor: ACCENT }]}>
                        <Text style={s.activeDotText}>{dayNum}</Text>
                      </View>
                    ) : (
                      <View style={s.inactiveDot}>
                        <Text style={[s.inactiveDotText, { color: C.text }]}>{dayNum}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── SALAS + ACCIONES ───────────────────────────────────────── */}
          <Text style={[s.sectionLabel, { color: C.textSub, marginTop: 20 }]}>{t('dashboard.myRooms')}</Text>
          <View style={[s.bigCard, cardShadow, { backgroundColor: C.cardBg }]}>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.roomRow}
            >
              {loading ? (
                <ActivityIndicator color={ACCENT} />
              ) : challenges.length === 0 ? (
                <Pressable
                  style={[s.roomBtn, { borderColor: ACCENT, borderWidth: 1.5, borderStyle: 'dashed', backgroundColor: 'transparent' }]}
                  onPress={() => router.push('/salas' as never)}
                >
                  <MaterialCommunityIcons name="plus" size={22} color={ACCENT} />
                  <Text style={[s.roomBtnTxt, { color: ACCENT }]}>{t('dashboard.createRoom')}</Text>
                </Pressable>
              ) : (
                challenges.slice(0, 6).map(ch => {
                  const active = selectedChallenge?.id === ch.id;
                  return (
                    <Pressable
                      key={ch.id}
                      onPress={() => selectRoom(ch, token)}
                      style={[s.roomBtn, { backgroundColor: active ? ACCENT : C.roomIdle }]}
                    >
                      <MaterialCommunityIcons
                        name="account-group"
                        size={22}
                        color={active ? '#fff' : C.textSub}
                      />
                      <Text
                        style={[s.roomBtnTxt, { color: active ? '#fff' : C.text }]}
                        numberOfLines={2}
                      >
                        {ch.name.length > 12 ? ch.name.slice(0, 12) + '…' : ch.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={[s.hdiv, { backgroundColor: C.border }]} />

            <View style={s.bottomRow}>

              {/* ── Miembros ─────────────────────────────────────────── */}
              <View style={s.membersCol}>
                <Text style={[s.colTitle, { color: C.textSub }]}>
                  {selectedChallenge ? t('dashboard.membersWithCount', { count: roomMembers.length }) : t('dashboard.members')}
                </Text>

                {membersLoading ? (
                  <ActivityIndicator color={ACCENT} size="small" style={{ marginTop: 12 }} />
                ) : !selectedChallenge ? (
                  <Text style={[s.emptyHint, { color: C.textSub }]}>{t('dashboard.selectRoom')}</Text>
                ) : roomMembers.length === 0 ? (
                  <Text style={[s.emptyHint, { color: C.textSub }]}>{t('dashboard.noMembers')}</Text>
                ) : (
                  <View style={s.avatarGrid}>
                    {roomMembers.slice(0, 4).map(m => {
                      const url = m.avatar_url ? getStorageUrl(m.avatar_url) : null;
                      return (
                        <View key={m.id} style={s.memberWrap}>
                          {url ? (
                            <Image source={{ uri: url }} style={s.memberImg} onError={() => {}} />
                          ) : (
                            <View style={[s.memberImg, s.memberFallback, { backgroundColor: isDark ? '#2a2a3e' : '#e0e0ea' }]}>
                              <Text style={[s.memberLetter, { color: C.text }]}>
                                {m.username.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    {roomMembers.length > 4 && (
                      <View style={[s.memberImg, s.memberFallback, { backgroundColor: isDark ? '#2a2a3e' : '#e0e0ea' }]}>
                        <Text style={[s.memberLetter, { color: C.text }]}>+{roomMembers.length - 4}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={[s.vdiv, { backgroundColor: C.border }]} />

              {/* ── Acciones ─────────────────────────────────────────── */}
              <View style={s.actionsCol}>
                <Text style={[s.colTitle, { color: C.textSub }]}>{t('dashboard.actionsTitle')}</Text>
                {ACTIONS.map(({ icon, label, onPress }) => (
                  <Pressable key={label} style={s.actionRow} onPress={onPress}>
                    <View style={[s.actionIcon, { backgroundColor: C.accentFg }]}>
                      <Ionicons name={icon} size={14} color={ACCENT} />
                    </View>
                    <Text style={[s.actionLabel, { color: C.text }]}>{label}</Text>
                    <Ionicons name="chevron-forward" size={12} color={C.textSub} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* ── FEED DE ACTIVIDAD ─────────────────────────────────────── */}
          {feedItems.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: C.textSub, marginTop: 20 }]}>{t('dashboard.recentActivity')}</Text>
              <View style={[s.feedCard, cardShadow, { backgroundColor: C.cardBg }]}>
                {feedItems.slice(0, 8).map((item, idx) => {
                  const avatarUrl = item.user_avatar ? getStorageUrl(item.user_avatar) : null;
                  const isLast    = idx === Math.min(feedItems.length, 8) - 1;
                  return (
                    <View key={`${item.type}-${idx}`}>
                      <View style={s.feedRow}>
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} style={s.feedAvatar} />
                        ) : (
                          <View style={[s.feedAvatar, s.feedAvatarFallback, { backgroundColor: isDark ? '#2a2a3e' : '#e0e0ea' }]}>
                            <Text style={[s.feedAvatarLetter, { color: C.text }]}>
                              {item.user_name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[s.feedText, { color: C.text }]} numberOfLines={2}>
                            {item.text}
                          </Text>
                          <Text style={[s.feedDate, { color: C.textSub }]}>{item.event_date}</Text>
                        </View>
                        {item.type === 'journey_photo' && item.photo_path && (
                          <Image
                            source={{ uri: getStorageUrl(item.photo_path) ?? undefined }}
                            style={s.feedThumb}
                          />
                        )}
                      </View>
                      {!isLast && <View style={[s.feedDivider, { backgroundColor: C.border }]} />}
                    </View>
                  );
                })}
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────────
  header:          { paddingHorizontal: HM, paddingBottom: 20 },
  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing:      { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT },
  avatarImg:       { width: 54, height: 54, borderRadius: 27 },
  avatarFallback:  { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,0,102,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial:   { color: ACCENT, fontSize: 22, fontWeight: '800' },
  hiLabel:         { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 1 },
  hiName:          { color: '#ffffff', fontSize: 22, letterSpacing: 0.3 },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle:      { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  streakPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  streakNum:       { color: '#ffffff', fontSize: 15 },
  xpRow:           { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  xpValue:         { color: '#ffffff', fontSize: 40, letterSpacing: 0.5, lineHeight: 44 },
  rankLink:        { color: ACCENT, fontSize: 13, fontWeight: '500' },

  // ── Body ────────────────────────────────────────────────────────────────────
  body:            { paddingHorizontal: HM, paddingBottom: 8 },
  sectionLabel:    { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, fontWeight: '800' },

  // ── Calendar ────────────────────────────────────────────────────────────────
  calCard:         { borderRadius: 16, padding: 16 },
  calRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayCol:          { alignItems: 'center', gap: 6 },
  dayName:         { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  activeDot:       { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  activeDotText:   { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  inactiveDot:     { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  inactiveDotText: { fontSize: 13, fontWeight: '600' },

  // ── Big card (salas + acciones) ──────────────────────────────────────────────
  bigCard:       { borderRadius: 20, overflow: 'hidden' },
  roomRow:       { flexDirection: 'row', gap: 10, padding: 16 },
  roomBtn:       { alignItems: 'center', justifyContent: 'center', width: 80, paddingVertical: 14, borderRadius: 18, gap: 6 },
  roomBtnTxt:    { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  hdiv:          { height: 1, marginHorizontal: 16 },
  vdiv:          { width: 1, marginVertical: 4 },
  bottomRow:     { flexDirection: 'row', padding: 16 },
  membersCol:    { flex: 1, paddingRight: 12 },
  colTitle:      { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  avatarGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberWrap:    {},
  memberImg:     { width: 42, height: 42, borderRadius: 21 },
  memberFallback:{ alignItems: 'center', justifyContent: 'center' },
  memberLetter:  { fontSize: 16, fontWeight: '800' },
  emptyHint:     { fontSize: 12, lineHeight: 18, marginTop: 4 },
  actionsCol:    { flex: 1, paddingLeft: 12 },
  actionRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  actionIcon:    { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actionLabel:   { fontSize: 13, fontWeight: '600', flex: 1 },

  // ── Message banner ──────────────────────────────────────────────────────────
  msgBanner:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1a1a2e', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,0,102,0.3)', gap: 10 },
  msgBannerLeft:    { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  msgBannerIcon:    { width: 34, height: 34, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgBannerFrom:    { color: ACCENT, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  msgBannerText:    { color: '#fff', fontSize: 13, lineHeight: 18 },
  msgBannerMore:    { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 },
  msgBannerClose:   { padding: 2, alignSelf: 'flex-start' },

  // ── Activity feed ──────────────────────────────────────────────────────────
  feedCard:         { borderRadius: 16, overflow: 'hidden', paddingHorizontal: 14 },
  feedRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  feedAvatar:       { width: 38, height: 38, borderRadius: 19 },
  feedAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  feedAvatarLetter: { fontSize: 15, fontWeight: '700' },
  feedText:         { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  feedDate:         { fontSize: 11, marginTop: 2 },
  feedThumb:        { width: 44, height: 44, borderRadius: 8 },
  feedDivider:      { height: 1, marginLeft: 48 },
});
