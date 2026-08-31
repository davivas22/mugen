import {
  BarlowCondensed_900Black,
  useFonts,
} from '@expo-google-fonts/barlow-condensed';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useColors } from '../context/ThemeContext';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { userApi, feedApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';
import { CrearSalaModal } from '../modal';

const H = 16;
const BOTTOM_NAV_HEIGHT = 88;

type MySala = {
  id: string;
  initial: string;
  name: string;
  meta: string;
  active: boolean;
  time?: string;
};

type FeedItem = {
  type: 'attendance' | 'photo';
  user_name: string;
  user_avatar: string | null;
  challenge_name: string;
  photo_path: string | null;
  event_date: string;
  text: string;
};

function challengeToMySala(c: any): MySala {
  const now   = new Date();
  const start = new Date(c.start_date);
  const end   = new Date(start);
  end.setDate(end.getDate() + (c.duration_days ?? 30));
  const active = now >= start && now <= end;
  const count  = c.members_count ?? 1;
  return {
    id:     String(c.id),
    initial: (c.name?.[0] ?? 'S').toUpperCase(),
    name:   c.name.toUpperCase(),
    meta:   `${count} miembro${count !== 1 ? 's' : ''} · ${c.challenge_mode ?? 'libre'}`,
    active,
    time:   !active ? new Date(c.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : undefined,
  };
}

function useEntrance(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, friction: 9, tension: 65, useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

function SalaCard({ sala, onPress, delay }: { sala: MySala; onPress: (id: string) => void; delay: number }) {
  const { C } = useColors();
  const anim = useEntrance(delay);

  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(sala.id)}
        style={[styles.salaCard, { backgroundColor: C.card }]}
      >
        <View style={[styles.avatar, { backgroundColor: C.border }]}>
          <Text style={[styles.avatarText, { color: C.textPrimary }]}>{sala.initial}</Text>
          {sala.active && <View style={[styles.activeDot, { backgroundColor: '#FF0066', borderColor: C.card }]} />}
        </View>
        <View style={styles.salaInfo}>
          <Text style={[styles.salaName, { color: C.textPrimary }]} numberOfLines={1}>{sala.name}</Text>
          <Text style={[styles.salaMeta, { color: C.textSecondary }]} numberOfLines={1}>{sala.meta}</Text>
        </View>
        <View style={styles.salaRight}>
          {sala.active
            ? <Text style={styles.liveText}>EN VIVO</Text>
            : <Text style={[styles.timeText, { color: C.textMuted }]}>{sala.time}</Text>
          }
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function FeedCard({ item, delay }: { item: FeedItem; delay: number }) {
  const { C } = useColors();
  const anim = useEntrance(delay);
  const avatarUrl = item.user_avatar ? getStorageUrl(item.user_avatar) : null;
  const initial   = (item.user_name?.[0] ?? '?').toUpperCase();
  const dateLabel = new Date(item.event_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <Animated.View style={[styles.feedCard, { backgroundColor: C.card }, anim]}>
      <View style={styles.feedTop}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={[styles.feedAvatar, { backgroundColor: C.border }]} contentFit="cover" />
        ) : (
          <View style={[styles.feedAvatar, { backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: C.textPrimary, fontWeight: '700', fontSize: 14 }}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.feedUser, { color: C.textPrimary }]}>{item.user_name}</Text>
          <Text style={[styles.feedMeta, { color: C.textSecondary }]}>{item.challenge_name} · {dateLabel}</Text>
        </View>
        <Text style={{ fontSize: 15 }}>{item.type === 'attendance' ? '🏋️' : '📸'}</Text>
      </View>
      <Text style={[styles.feedText, { color: C.textPrimary }]} numberOfLines={3}>{item.text}</Text>
      {item.type === 'photo' && item.photo_path && (
        <Image
          source={{ uri: getStorageUrl(item.photo_path) ?? undefined }}
          style={styles.feedPhoto}
          contentFit="cover"
        />
      )}
    </Animated.View>
  );
}

export default function SalasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { C, isDark } = useColors();

  const [mySalas, setMySalas]         = useState<MySala[]>([]);
  const [loading, setLoading]         = useState(true);
  const [feedItems, setFeedItems]     = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useEntrance(0);

  const [fontsLoaded] = useFonts({ BarlowCondensed_900Black });

  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: searchOpen ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [searchOpen]);

  const searchHeight = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 48] });

  const loadChallenges = useCallback(async () => {
    const t = await storage.get('token');
    if (t) {
      try {
        const res = await userApi.myChallenges(t);
        setMySalas((res.data.challenges ?? []).map(challengeToMySala));
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  const loadFeed = useCallback(async () => {
    const t = await storage.get('token');
    if (t) {
      try {
        const res = await feedApi.get(t);
        setFeedItems(res.data.feed ?? []);
      } catch (_) {}
    }
    setLoadingFeed(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadChallenges();
    loadFeed();
  }, [loadChallenges, loadFeed]));

  const filtered = searchQuery.trim()
    ? mySalas.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : mySalas;

  const activeCount = mySalas.filter(s => s.active).length;
  const HEADER_BG = isDark ? '#0a0a0a' : '#111111';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['bottom']}>
      <StatusBar style="light" backgroundColor={HEADER_BG} />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: HEADER_BG, paddingTop: insets.top + 8 }]}>
        <Animated.View style={headerAnim}>
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.title, fontsLoaded ? { fontFamily: 'BarlowCondensed_900Black' } : { fontWeight: '900' }]}>
                SALAS
              </Text>
              <Text style={styles.titleSub}>
                {loading ? 'Cargando...' : `${activeCount} activa${activeCount !== 1 ? 's' : ''} · ${mySalas.length} total`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
              onPress={() => { setSearchOpen(p => { if (p) setSearchQuery(''); return !p; }); }}
            >
              <Ionicons name={searchOpen ? 'close-outline' : 'search-outline'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ height: searchHeight, overflow: 'hidden', marginBottom: searchOpen ? 12 : 0 }}>
            <View style={[styles.searchWrap, { backgroundColor: 'rgba(255,255,255,0.07)', marginTop: 10 }]}>
              <Ionicons name="search-outline" size={15} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar sala..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={15} color="rgba(255,255,255,0.35)" />
                </Pressable>
              )}
            </View>
          </Animated.View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnCreate, { backgroundColor: '#FF0066' }]}
              activeOpacity={0.8}
              onPress={() => setShowModal(true)}
            >
              <Ionicons name="add" size={17} color="#fff" />
              <Text style={styles.btnText}>CREAR SALA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnJoin, { borderColor: 'rgba(255,255,255,0.18)' }]}
              activeOpacity={0.8}
              onPress={() => router.push('/salas/crear' as any)}
            >
              <Ionicons name="link-outline" size={15} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.btnText, { color: 'rgba(255,255,255,0.7)' }]}>UNIRSE</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* BODY */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 24 }}
      >
        {/* MIS SALAS */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>MIS SALAS</Text>

          {loading ? (
            <View style={styles.empty}>
              <Ionicons name="hourglass-outline" size={36} color={C.textMuted} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>Cargando...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={36} color={C.textMuted} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>
                {searchQuery ? 'Sin resultados' : 'Aún no estás en ninguna sala'}
              </Text>
            </View>
          ) : (
            <View style={[styles.cardGroup, { backgroundColor: C.card }]}>
              {filtered.map((sala, i) => (
                <View key={sala.id}>
                  <SalaCard
                    sala={sala}
                    onPress={id => router.push(`/screens/RoomDetailScreen?id=${id}` as never)}
                    delay={i * 50}
                  />
                  {i < filtered.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: C.border, marginLeft: 68 }]} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ACTIVIDAD */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>ACTIVIDAD RECIENTE</Text>
          {loadingFeed ? (
            <Text style={[styles.emptyText, { color: C.textMuted, textAlign: 'center', marginTop: 8 }]}>Cargando...</Text>
          ) : feedItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 26 }}>🏋️</Text>
              <Text style={[styles.emptyText, { color: C.textMuted }]}>Sin actividad reciente</Text>
            </View>
          ) : (
            feedItems.slice(0, 5).map((item, i) => (
              <FeedCard key={`${item.type}-${i}`} item={item} delay={180 + i * 60} />
            ))
          )}
        </View>
      </ScrollView>

      <CrearSalaModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: H,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    color: '#fff',
    letterSpacing: 2,
  },
  titleSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  btnCreate: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnJoin: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  section: {
    marginTop: 22,
    paddingHorizontal: H,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  cardGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  salaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  salaInfo: {
    flex: 1,
    marginLeft: 12,
  },
  salaName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  salaMeta: {
    fontSize: 12,
  },
  salaRight: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF0066',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },

  feedCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  feedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  feedUser: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  feedMeta: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  feedText: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginTop: 10,
  },
});
