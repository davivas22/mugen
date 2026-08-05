import {
  BarlowCondensed_400Regular,
  BarlowCondensed_700Bold,
  BarlowCondensed_900Black,
  useFonts,
} from '@expo-google-fonts/barlow-condensed';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useColors } from '../context/ThemeContext';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { userApi, feedApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';
import { CrearSalaModal } from '../modal';

const BOTTOM_NAV_HEIGHT = 88;
const HORIZONTAL_MARGIN = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const FEATURED_CARD_HEIGHT = 180;

type FilterKey = 'TODAS' | 'ACTIVAS' | 'PRIVADAS' | 'PÚBLICAS';

type MySala = {
  id: string;
  initial: string;
  name: string;
  lastMessage: string;
  active: boolean;
  visibility: 'public' | 'private';
  time?: string;
  newUpdates: number;
};

type FeedItem = {
  type: 'attendance' | 'photo';
  user_name: string;
  user_avatar: string | null;
  challenge_name: string;
  photo_path: string | null;
  photo_id: number | null;
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
    id:          String(c.id),
    initial:     (c.name?.[0] ?? 'S').toUpperCase(),
    name:        c.name.toUpperCase(),
    lastMessage: `${count} miembro${count !== 1 ? 's' : ''} · ${c.challenge_mode ?? 'libre'}`,
    active,
    visibility:  'public',
    time:        active ? undefined : `Desde ${new Date(c.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
    newUpdates:  0,
  };
}


const FILTERS: FilterKey[] = ['TODAS', 'ACTIVAS', 'PRIVADAS', 'PÚBLICAS'];

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  android: { elevation: 2 },
  default: {},
});

function filterMySalas(salas: MySala[], filter: FilterKey): MySala[] {
  switch (filter) {
    case 'ACTIVAS':
      return salas.filter((s) => s.active);
    case 'PRIVADAS':
      return salas.filter((s) => s.visibility === 'private');
    case 'PÚBLICAS':
      return salas.filter((s) => s.visibility === 'public');
    default:
      return salas;
  }
}

function SalaAvatar({ initial, active }: { initial: string; active?: boolean }) {
  return (
    <View style={styles.avatarWrap}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{initial}</Text>
      </View>
      {active ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

function MySalaRow({
  sala,
  animatedStyle,
  onPress,
}: {
  sala: MySala;
  animatedStyle: object;
  onPress: (id: string) => void;
}) {
  const { C } = useColors();
  const ACCENT = C.mugenPink;
  const CARD_BG = C.card;
  const TEXT_PRIMARY = C.textPrimary;
  const TEXT_SECONDARY = C.textSecondary;

  return (
    <Animated.View style={[styles.listCard, { backgroundColor: CARD_BG }, cardShadow, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(sala.id)}
        style={styles.salaRow}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { backgroundColor: C.border }]}>
            <Text style={[styles.avatarInitial, { color: TEXT_PRIMARY }]}>
              {sala.initial}
            </Text>
          </View>
          {sala.active ? <View style={[styles.activeDot, { backgroundColor: ACCENT, borderColor: CARD_BG }]} /> : null}
        </View>
        <View style={styles.salaCenter}>
          <Text style={[styles.salaName, { color: TEXT_PRIMARY }]} numberOfLines={1}>{sala.name}</Text>
          <Text style={[styles.salaMessage, { color: TEXT_SECONDARY }]} numberOfLines={1}>{sala.lastMessage}</Text>
        </View>
        <View style={styles.salaRight}>
          {sala.active ? (
            <Text style={[styles.liveLabel, { color: ACCENT }]}>EN VIVO</Text>
          ) : (
            <Text style={[styles.timeLabel, { color: C.textMuted }]}>{sala.time}</Text>
          )}
          {sala.newUpdates > 0 ? (
            <View style={[styles.updatePill, { backgroundColor: ACCENT }]}>
              <Text style={styles.updatePillText}>{sala.newUpdates}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}


function ActivityFeedCard({
  item,
  animatedStyle,
}: {
  item: FeedItem;
  animatedStyle: object;
}) {
  const { C } = useColors();
  const CARD_BG = C.card;
  const TEXT_PRIMARY = C.textPrimary;
  const TEXT_SECONDARY = C.textSecondary;
  const BORDER_LIGHT = C.border;
  const ACCENT = C.mugenPink;

  const avatarUrl = item.user_avatar ? getStorageUrl(item.user_avatar) : null;
  const initial = (item.user_name?.[0] ?? '?').toUpperCase();
  const dateLabel = new Date(item.event_date)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    .toUpperCase();
  const meta = `${item.challenge_name.toUpperCase()} · ${dateLabel}`;

  return (
    <Animated.View style={[styles.activityCard, { backgroundColor: CARD_BG }, cardShadow, animatedStyle]}>
      <View style={styles.activityTopRow}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[styles.activityAvatar, { backgroundColor: BORDER_LIGHT }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.activityAvatar, { backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{initial}</Text>
          </View>
        )}
        <View style={styles.activityHeaderText}>
          <Text style={[styles.activityUsername, { color: TEXT_PRIMARY }]}>
            {item.user_name.toUpperCase()}
          </Text>
          <Text style={[styles.activityMeta, { color: TEXT_SECONDARY }]}>{meta}</Text>
        </View>
        <Text style={{ fontSize: 18 }}>{item.type === 'attendance' ? '🏋️' : '📸'}</Text>
      </View>

      <Text style={[styles.activityNote, { color: TEXT_PRIMARY }]} numberOfLines={3}>
        {item.text}
      </Text>

      {item.type === 'photo' && item.photo_path ? (
        <Image
          source={{ uri: getStorageUrl(item.photo_path) ?? undefined }}
          style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 10 }}
          contentFit="cover"
        />
      ) : null}
    </Animated.View>
  );
}

function AnimatedActivityCard({
  item,
  opacity,
  translateY,
}: {
  item: FeedItem;
  opacity: SharedValue<number>;
  translateY: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <ActivityFeedCard item={item} animatedStyle={animatedStyle} />;
}

function FilterPill({
  label,
  active,
  onPress,
  opacity,
}: {
  label: FilterKey;
  active: boolean;
  onPress: (filter: FilterKey) => void;
  opacity: SharedValue<number>;
}) {
  const { C } = useColors();
  const ACCENT = C.mugenPink;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.filterPill, active && { backgroundColor: ACCENT, borderColor: ACCENT }]}
        onPress={() => onPress(label)}
      >
        <Text style={[styles.filterPillText, active && { color: '#ffffff' }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function AnimatedMySalaRow({
  sala,
  opacity,
  translateY,
  onPress,
}: {
  sala: MySala;
  opacity: SharedValue<number>;
  translateY: SharedValue<number>;
  onPress: (id: string) => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <MySalaRow sala={sala} animatedStyle={animatedStyle} onPress={onPress} />;
}

export default function SalasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { C, isDark } = useColors();
  const ACCENT = C.mugenPink;
  const HEADER_BG = isDark ? '#000000' : '#fefafa';
  const BODY_BG = C.bg;
  const CARD_BG = C.card;
  const TEXT_PRIMARY = C.textPrimary;
  const TEXT_SECONDARY = C.textSecondary;
  const TEXT_MUTED = C.textMuted;
  const BORDER_LIGHT = C.border;

  const [mySalas, setMySalas]         = useState<MySala[]>([]);
  const [loadingSalas, setLoadingSalas] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('TODAS');
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [feedItems, setFeedItems]       = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed]   = useState(true);
  const [showModal, setShowModal]       = useState(false);

  const [fontsLoaded] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_700Bold,
    BarlowCondensed_900Black,
  });

  const headerTranslateY = useSharedValue(-24);
  const headerOpacity = useSharedValue(0);
  const searchHeight = useSharedValue(0);
  const searchOpacity = useSharedValue(0);
  const actionsTranslateY = useSharedValue(24);
  const actionsOpacity = useSharedValue(0);

  const pillOpacity0 = useSharedValue(0);
  const pillOpacity1 = useSharedValue(0);
  const pillOpacity2 = useSharedValue(0);
  const pillOpacity3 = useSharedValue(0);
  const pillOpacities = [pillOpacity0, pillOpacity1, pillOpacity2, pillOpacity3];

  const myOpacity0 = useSharedValue(0);
  const myOpacity1 = useSharedValue(0);
  const myOpacity2 = useSharedValue(0);
  const myOpacity3 = useSharedValue(0);
  const myOpacity4 = useSharedValue(0);
  const myTranslate0 = useSharedValue(12);
  const myTranslate1 = useSharedValue(12);
  const myTranslate2 = useSharedValue(12);
  const myTranslate3 = useSharedValue(12);
  const myTranslate4 = useSharedValue(12);
  const myRowOpacities  = [myOpacity0, myOpacity1, myOpacity2, myOpacity3, myOpacity4];
  const myRowTranslateY = [myTranslate0, myTranslate1, myTranslate2, myTranslate3, myTranslate4];

  const activityOpacity0 = useSharedValue(0);
  const activityOpacity1 = useSharedValue(0);
  const activityOpacity2 = useSharedValue(0);
  const activityOpacity3 = useSharedValue(0);
  const activityOpacity4 = useSharedValue(0);
  const activityTranslate0 = useSharedValue(16);
  const activityTranslate1 = useSharedValue(16);
  const activityTranslate2 = useSharedValue(16);
  const activityTranslate3 = useSharedValue(16);
  const activityTranslate4 = useSharedValue(16);
  const activityOpacities  = [activityOpacity0, activityOpacity1, activityOpacity2, activityOpacity3, activityOpacity4];
  const activityTranslateY = [activityTranslate0, activityTranslate1, activityTranslate2, activityTranslate3, activityTranslate4];

  useEffect(() => {
    const easeOut = Easing.out(Easing.ease);

    headerTranslateY.value = withTiming(0, { duration: 400, easing: easeOut });
    headerOpacity.value = withTiming(1, { duration: 400, easing: easeOut });

    FILTERS.forEach((_, index) => {
      pillOpacities[index].value = withDelay(
        200 + index * 50,
        withTiming(1, { duration: 400, easing: easeOut })
      );
    });

    [0, 1, 2, 3, 4].forEach((index) => {
      myRowOpacities[index].value = withDelay(
        300 + index * 70,
        withTiming(1, { duration: 450, easing: easeOut })
      );
      myRowTranslateY[index].value = withDelay(
        300 + index * 70,
        withTiming(0, { duration: 450, easing: easeOut })
      );
    });

    [0, 1, 2, 3, 4].forEach((index) => {
      activityOpacities[index].value  = withDelay(500 + index * 80, withTiming(1, { duration: 450, easing: easeOut }));
      activityTranslateY[index].value = withDelay(500 + index * 80, withTiming(0, { duration: 450, easing: easeOut }));
    });

    actionsTranslateY.value = withDelay(720, withTiming(0, { duration: 450, easing: easeOut }));
    actionsOpacity.value = withDelay(720, withTiming(1, { duration: 450, easing: easeOut }));
  }, []);

  const loadChallenges = useCallback(async () => {
    const t = await storage.get('token');
    if (t) {
      try {
        const res = await userApi.myChallenges(t);
        const mapped: MySala[] = (res.data.challenges ?? []).map(challengeToMySala);
        setMySalas(mapped);
      } catch (_) {}
    }
    setLoadingSalas(false);
  }, []);

  const loadFeed = useCallback(async () => {
    setLoadingFeed(true);
    const t = await storage.get('token');
    if (t) {
      try {
        const res = await feedApi.get(t);
        setFeedItems(res.data.feed ?? []);
      } catch (_) {}
    }
    setLoadingFeed(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChallenges();
      loadFeed();
    }, [loadChallenges, loadFeed])
  );

  useEffect(() => {
    const easeOut = Easing.out(Easing.ease);
    if (searchOpen) {
      searchHeight.value = withTiming(52, { duration: 280, easing: easeOut });
      searchOpacity.value = withTiming(1, { duration: 220, easing: easeOut });
    } else {
      searchHeight.value = withTiming(0, { duration: 220, easing: easeOut });
      searchOpacity.value = withTiming(0, { duration: 180, easing: easeOut });
    }
  }, [searchOpen]);

  const barlowTitle = () => {
    if (!fontsLoaded) {
      return {
        fontFamily: Platform.select({
          ios: 'System',
          android: 'sans-serif',
          default: 'sans-serif',
        }),
        fontWeight: '700' as const,
      };
    }
    return { fontFamily: 'BarlowCondensed_900Black' };
  };

  const barlowFont = (weight: '400' | '700' | '900') => {
    if (!fontsLoaded) {
      return {
        fontFamily: Platform.select({
          ios: 'System',
          android: 'sans-serif',
          default: 'sans-serif',
        }),
        fontWeight: weight === '400' ? ('400' as const) : ('700' as const),
      };
    }
    switch (weight) {
      case '900':
        return { fontFamily: 'BarlowCondensed_900Black' };
      case '700':
        return { fontFamily: 'BarlowCondensed_700Bold' };
      default:
        return { fontFamily: 'BarlowCondensed_400Regular' };
    }
  };

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const searchBarStyle = useAnimatedStyle(() => ({
    height: searchHeight.value,
    opacity: searchOpacity.value,
    marginBottom: searchHeight.value > 0 ? 12 : 0,
    overflow: 'hidden',
  }));

  const filteredMySalas = useMemo(() => {
    const byFilter = filterMySalas(mySalas, activeFilter);
    if (!searchQuery.trim()) return byFilter;
    const q = searchQuery.trim().toLowerCase();
    return byFilter.filter((s) => s.name.toLowerCase().includes(q));
  }, [mySalas, activeFilter, searchQuery]);

  const activeCount = mySalas.filter((s) => s.active).length;

  const scrollBottomPadding =
    BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 8) + 16;

  const handleSalaPress = useCallback((id: string) => {
    router.push(`/screens/RoomDetailScreen?id=${id}` as never);
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: BODY_BG }]} edges={['bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={isDark ? '#000000' : HEADER_BG} />

      <View style={[styles.screen, { backgroundColor: BODY_BG }]}>
        {/* DARK HEADER ZONE */}
        <View style={[styles.headerZone, { backgroundColor: HEADER_BG, paddingTop: insets.top + 8 }]}>
          <Animated.View style={headerStyle}>
            <View style={styles.headerTopRow}>
              <Text style={[styles.screenTitle, barlowTitle()]}>SALAS</Text>
              <Pressable
                onPress={toggleSearch}
                style={styles.searchIconButton}
                accessibilityLabel="Buscar salas"
              >
                <Ionicons name="search-outline" size={22} color="#ffffff" />
              </Pressable>
            </View>
            <Text style={styles.headerSubtitle}>
              {loadingSalas ? 'Cargando...' : `${activeCount} sala${activeCount !== 1 ? 's' : ''} activa${activeCount !== 1 ? 's' : ''}`}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.searchBarOuter, searchBarStyle]}>
            <View style={[styles.searchInputWrap, { backgroundColor: CARD_BG }]}>
              <Ionicons name="search-outline" size={18} color={TEXT_SECONDARY} />
              <TextInput
                style={[styles.searchInput, { color: TEXT_PRIMARY }]}
                placeholder="Buscar sala por nombre..."
                placeholderTextColor={TEXT_SECONDARY}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {FILTERS.map((filter, index) => (
              <FilterPill
                key={filter}
                label={filter}
                active={activeFilter === filter}
                onPress={setActiveFilter}
                opacity={pillOpacities[index]}
              />
            ))}
          </ScrollView>

          {/* ACTION BUTTONS — crear / unirse */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerCreateBtn, { backgroundColor: ACCENT }]}
              activeOpacity={0.8}
              onPress={() => setShowModal(true)}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.headerCreateText}>CREAR SALA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerJoinBtn, { backgroundColor: CARD_BG, borderColor: TEXT_PRIMARY }]}
              activeOpacity={0.8}
              onPress={() => router.push('/salas/crear' as any)}
            >
              <Ionicons name="search-outline" size={18} color={TEXT_PRIMARY} />
              <Text style={[styles.headerJoinText, { color: TEXT_PRIMARY }]}>UNIRSE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BODY */}
        <ScrollView
          style={[styles.scroll, { backgroundColor: BODY_BG }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        >
          <Text style={[styles.sectionLabel, { color: TEXT_SECONDARY }]}>MIS SALAS</Text>

          {loadingSalas ? (
            <View style={styles.emptyState}>
              <Ionicons name="hourglass-outline" size={48} color="#cccccc" />
              <Text style={[styles.emptyTitle, { color: TEXT_SECONDARY }]}>Cargando tus salas...</Text>
            </View>
          ) : filteredMySalas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#cccccc" />
              <Text style={[styles.emptyTitle, { color: TEXT_SECONDARY }]}>Aún no estás en ninguna sala.</Text>
              <Text style={[styles.emptySub, { color: TEXT_MUTED }]}>¿A qué esperas?</Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: CARD_BG }, cardShadow]}>
              {filteredMySalas.map((sala, index) => {
                const animIndex = mySalas.findIndex((s) => s.id === sala.id);
                return (
                  <View key={sala.id}>
                    <AnimatedMySalaRow
                      sala={sala}
                      opacity={myRowOpacities[animIndex] ?? myOpacity0}
                      translateY={myRowTranslateY[animIndex] ?? myTranslate0}
                      onPress={handleSalaPress}
                    />
                    {index < filteredMySalas.length - 1 ? (
                      <View style={[styles.rowDivider, { backgroundColor: BORDER_LIGHT }]} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: TEXT_SECONDARY }]}>
            ACTIVIDAD DE LA SALA
          </Text>

          <View style={styles.activityFeed}>
            {loadingFeed ? (
              <Text style={{ color: TEXT_MUTED, textAlign: 'center', marginTop: 8, marginBottom: 16 }}>
                Cargando actividad...
              </Text>
            ) : feedItems.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🏋️</Text>
                <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Sin actividad reciente en tus salas</Text>
              </View>
            ) : (
              feedItems.slice(0, 5).map((item, index) => (
                <AnimatedActivityCard
                  key={`${item.type}-${index}`}
                  item={item}
                  opacity={activityOpacities[index] ?? activityOpacity0}
                  translateY={activityTranslateY[index] ?? activityTranslate0}
                />
              ))
            )}
          </View>
        </ScrollView>

      </View>

      <CrearSalaModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },

  headerZone: {
    paddingHorizontal: HORIZONTAL_MARGIN,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: 32,
    color: '#ffffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  searchIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 16,
  },
  searchBarOuter: {
    overflow: 'hidden',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filtersRow: {
    gap: 8,
    paddingTop: 4,
  },
  filterPill: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterPillActive: {},
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filterPillTextActive: {},

  scroll: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginHorizontal: HORIZONTAL_MARGIN,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionLabelSpaced: {
    marginTop: 24,
  },
  listCard: {
    borderRadius: 12,
    marginHorizontal: HORIZONTAL_MARGIN,
    overflow: 'hidden',
  },
  salaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    position: 'relative',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  salaCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  salaName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  salaMessage: {
    fontSize: 13,
  },
  salaRight: {
    alignItems: 'flex-end',
    minWidth: 64,
    gap: 6,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timeLabel: {
    fontSize: 12,
  },
  updatePill: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  updatePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  rowDivider: {
    height: 1,
    marginLeft: 74,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: HORIZONTAL_MARGIN,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },

  featuredScrollContent: {
    paddingLeft: HORIZONTAL_MARGIN,
    gap: 12,
    paddingRight: HORIZONTAL_MARGIN,
    paddingBottom: 4,
  },
  featuredCardWrap: {
    width: FEATURED_CARD_WIDTH,
    height: FEATURED_CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featuredCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  featuredContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredPill: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  verTodosText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuredBottom: {
    gap: 4,
  },
  featuredName: {
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featuredMembers: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
  },

  activitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: HORIZONTAL_MARGIN,
    marginTop: 24,
    marginBottom: 12,
  },
  activitySectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  activityTabs: {
    flexDirection: 'row',
    gap: 16,
  },
  activityTab: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  activityTabText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  activityTabTextActive: {},
  activityTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  activityFeed: {
    marginHorizontal: HORIZONTAL_MARGIN,
    gap: 12,
    marginBottom: 8,
  },
  activityCard: {
    borderRadius: 12,
    padding: 20,
  },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  activityHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  activityUsername: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  activityMenu: {
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 1,
  },
  activityNote: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  activityStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  activityStatBox: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
  },
  activityStatLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  activityStatValue: {
    fontSize: 16,
  },
  activityStatAccent: {},
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityFooterLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  activityFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityFooterCount: {
    fontSize: 12,
  },

  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  headerCreateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerCreateText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerJoinBtn: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerJoinText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

});
