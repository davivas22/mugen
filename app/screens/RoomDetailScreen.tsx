import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import * as Clipboard    from 'expo-clipboard';
import * as ImagePicker  from 'expo-image-picker';
import { Image }         from 'expo-image';
import { LinearGradient }from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar }     from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming,
  Easing, FadeInDown,
} from 'react-native-reanimated';
import {
  useFonts,
  BarlowCondensed_400Regular,
  BarlowCondensed_700Bold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { challengeApi, journeyApi, attendanceApi, messageApi, getStorageUrl, inviteApi } from '../../services/api';
import { storage } from '../../services/storage';
import { attendanceTracker, AttendanceTrackerState } from '../../services/attendanceTracker';
import { useTranslation } from 'react-i18next';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT       = '#FF0066';
const BG_DARK      = '#07070F';
const CARD_BG      = '#0F0F1A';
const CARD_BG2     = '#141424';
const CARD_BORDER  = '#1E1E30';
const TEXT_LIGHT   = '#F0F0F5';
const TEXT_SUB     = '#9A9AB5';
const TEXT_MUTED   = '#7A7A99';
const GOLD         = '#FFD700';
const SILVER       = '#C0C0C0';
const BRONZE       = '#CD7F32';
const FONT_BOLD    = 'BarlowCondensed_700Bold';
const HM           = 16;
const { width: SW }= Dimensions.get('window');

const HERO_IMAGE = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=85&auto=format&fit=crop';
const MONTHS_SHORT = { es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
const REQUIRED_SECONDS = 300;

const DARK_MAP_STYLE = [
  { elementType: 'geometry',             stylers: [{ color: '#0F0F1A' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#07070F' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#6B6B8A' }] },
  { featureType: 'road',         elementType: 'geometry',        stylers: [{ color: '#1E1E30' }] },
  { featureType: 'road',         elementType: 'geometry.stroke', stylers: [{ color: '#141424' }] },
  { featureType: 'road',         elementType: 'labels.text.fill',stylers: [{ color: '#4A4A6A' }] },
  { featureType: 'water',        elementType: 'geometry',        stylers: [{ color: '#0D0D18' }] },
  { featureType: 'poi',          elementType: 'geometry',        stylers: [{ color: '#141424' }] },
  { featureType: 'transit',      elementType: 'geometry',        stylers: [{ color: '#141424' }] },
  { featureType: 'administrative',elementType: 'geometry.stroke',stylers: [{ color: '#1E1E30' }] },
];
// ─── Types ────────────────────────────────────────────────────────────────────
type Participant = {
  id: number; username: string; avatar_url: string | null;
  rank: number; points: number; sessions: number; total_reps: number; attendance_count: number; streak?: number;
};
type JourneyEntry = {
  id: number; imageUri: string; date: string; note: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberAvatar({ url, name, size = 44, borderColor = 'transparent', borderWidth = 0 }: {
  url: string | null; name: string; size?: number; borderColor?: string; borderWidth?: number;
}) {
  const [err, setErr] = useState(false);
  if (url && !err) {
    return (
      <Image source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth, borderColor }}
        contentFit="cover" onError={() => setErr(true)} />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(255,0,102,0.18)',
      alignItems: 'center', justifyContent: 'center', borderWidth, borderColor,
    }}>
      <Text style={{ color: ACCENT, fontSize: size * 0.38, fontWeight: '800' }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function RankMedal({ rank, size = 14 }: { rank: number; size?: number }) {
  if (rank === 1) {
    return <MaterialCommunityIcons name="crown" size={size} color={GOLD} />;
  }
  if (rank === 2) {
    return <MaterialCommunityIcons name="medal" size={size} color={SILVER} />;
  }
  if (rank === 3) {
    return <MaterialCommunityIcons name="medal" size={size} color={BRONZE} />;
  }
  return null;
}

function StatPill({ icon, value, label, accent = false }: {
  icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string; accent?: boolean;
}) {
  return (
    <View style={[st.statPill, accent && { borderColor: ACCENT + '40', backgroundColor: ACCENT + '10' }]}>
      <Ionicons name={icon} size={15} color={accent ? ACCENT : TEXT_SUB} />
      <Text style={[st.statPillVal, accent && { color: ACCENT }]}>{value}</Text>
      <Text style={st.statPillLbl}>{label}</Text>
    </View>
  );
}

function StreakRow({ streak }: { streak: number }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <MaterialCommunityIcons name="fire" size={14} color={GOLD} />
      <Text style={{ color: TEXT_LIGHT, fontWeight: '700', fontSize: 12 }}>
        {t('roomDetail.currentStreak', { count: streak })}
      </Text>
    </View>
  );
}

function ProgressBar({ pct, label, valueText }: { pct: number; label: string; valueText?: string }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(pct, { duration: 900 }); }, [pct]);
  const barW = useAnimatedStyle(() => ({ width: `${w.value}%` as any }));
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={st.progLabel}>{label}</Text>
        <Text style={[st.progLabel, { color: ACCENT }]}>
          {valueText ?? `${Math.round(pct)}%`}
        </Text>
      </View>
      <View style={st.progTrack}>
        <Animated.View style={[st.progFill, barW]} />
      </View>
    </View>
  );
}

function CompareRow({ label, a, b, aName, bName }: {
  label: string; a: number; b: number; aName: string; bName: string;
}) {
  const total = a + b || 1;
  const aPct  = (a / total) * 100;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[st.progLabel, { textAlign: 'center', marginBottom: 6 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: TEXT_LIGHT, fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' }}>{a}</Text>
        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: CARD_BORDER, overflow: 'hidden' }}>
          <View style={{ width: `${aPct}%`, height: 8, backgroundColor: ACCENT, borderRadius: 4 }} />
        </View>
        <Text style={{ color: TEXT_LIGHT, fontSize: 11, fontWeight: '700', width: 36 }}>{b}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: TEXT_MUTED, fontSize: 9, maxWidth: 80 }} numberOfLines={1}>{aName}</Text>
        <Text style={{ color: TEXT_MUTED, fontSize: 9, maxWidth: 80, textAlign: 'right' }} numberOfLines={1}>{bName}</Text>
      </View>
    </View>
  );
}

// ─── Date Wheel Picker (custom, no deps) ──────────────────────────────────────
function DateWheel({ label, value, min, max, format, onChange }: {
  label: string; value: number; min: number; max: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const fmt = format ?? ((v: number) => String(v).padStart(2, '0'));
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>{label}</Text>
      <Pressable
        onPress={() => onChange(value < max ? value + 1 : min)}
        style={st.wheelArrow}
        hitSlop={8}
      >
        <Ionicons name="chevron-up" size={18} color={ACCENT} />
      </Pressable>
      <Text style={st.wheelValue}>{fmt(value)}</Text>
      <Pressable
        onPress={() => onChange(value > min ? value - 1 : max)}
        style={st.wheelArrow}
        hitSlop={8}
      >
        <Ionicons name="chevron-down" size={18} color={ACCENT} />
      </Pressable>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function RoomDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const i18nLocale: 'es' | 'en' = (i18n.resolvedLanguage ?? i18n.language ?? 'es').slice(0, 2) === 'en' ? 'en' : 'es';

  const [fontsLoaded] = useFonts({
    BarlowCondensed_400Regular, BarlowCondensed_700Bold, BarlowCondensed_900Black,
  });

  // ── Auth / room ─────────────────────────────────────────────────────────────
  const [token,              setToken]              = useState('');
  const [currentUser,        setCurrentUser]        = useState<any>(null);
  const [challengeName,      setChallengeName]      = useState('');
  const [coverImage,         setCoverImage]         = useState<string | null>(null);
  const [inviteCode,         setInviteCode]         = useState('');
  const [copied,             setCopied]             = useState(false);
  const [challengeCreatorId, setChallengeCreatorId] = useState<number | null>(null);
  const [isPrivate,          setIsPrivate]          = useState(false);
  const [startDate,          setStartDate]          = useState<string | null>(null);
  const [durationDays,       setDurationDays]       = useState(30);
  // Join requests (solo sala privada)
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [roomRequests,      setRoomRequests]      = useState<any[]>([]);
  const [loadingRequests,   setLoadingRequests]   = useState(false);
  const [respondingId,      setRespondingId]      = useState<number | null>(null);

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  const [leaderboard,   setLeaderboard]   = useState<Participant[]>([]);
  const [loadingLB,     setLoadingLB]     = useState(false);
  const [selectedPeriod,setSelectedPeriod]= useState<'semana' | 'mes' | 'año'>('semana');
  const [selectedMember,setSelectedMember]= useState<Participant | null>(null);

  // ── Compare ─────────────────────────────────────────────────────────────────
  const [compareMode,   setCompareMode]   = useState(false);
  const [compareTarget, setCompareTarget] = useState<Participant | null>(null);


  // ── Bio / goal (own profile) ────────────────────────────────────────────────
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioText,      setBioText]      = useState('');
  const [goalText,     setGoalText]     = useState('');

  // ── Edit room ───────────────────────────────────────────────────────────────
  const [showMenu,    setShowMenu]    = useState(false);
  const [showEditModal,setShowEditModal]=useState(false);
  const [editName,    setEditName]    = useState('');
  const [editCoverUri,setEditCoverUri]= useState<string | null>(null);
  const [savingEdit,  setSavingEdit]  = useState(false);

  // ── Journey ─────────────────────────────────────────────────────────────────
  const [journey,         setJourney]         = useState<JourneyEntry[]>([]);
  const [showJourneyModal,setShowJourneyModal] = useState(false);
  const [pickingImage,    setPickingImage]     = useState(false);
  const [newImgUri,       setNewImgUri]        = useState<string | null>(null);
  const [newNote,         setNewNote]          = useState('');
  const [journeyDay,      setJourneyDay]       = useState(new Date().getDate());
  const [journeyMonth,    setJourneyMonth]     = useState(new Date().getMonth() + 1);
  const [journeyYear,     setJourneyYear]      = useState(new Date().getFullYear());
  const [savingJourney,   setSavingJourney]    = useState(false);

  // ── Gym / attendance ─────────────────────────────────────────────────────────
  const [useLocation,      setUseLocation]      = useState(false);
  const [useCamera,        setUseCamera]        = useState(false);
  const [enableBets,       setEnableBets]       = useState(false);
  const [gymLat,           setGymLat]           = useState<number | null>(null);
  const [gymLng,           setGymLng]           = useState<number | null>(null);
  const [gymRadius,        setGymRadius]        = useState(200);
  const [checkingIn,       setCheckingIn]       = useState(false);
  const [attState,         setAttState]         = useState<AttendanceTrackerState>(attendanceTracker.state);
  // Camera attendance
  const [cameraPhotoUri,    setCameraPhotoUri]    = useState<string | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [pendingToday,      setPendingToday]      = useState(false);
  const [pendingAttendances,setPendingAttendances]= useState<any[]>([]);
  const [confirmingId,      setConfirmingId]      = useState<number | null>(null);
  // Other user profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  // Room messages
  const [showMsgModal,   setShowMsgModal]   = useState(false);
  const [roomMsgs,       setRoomMsgs]       = useState<any[]>([]);
  const [msgText,        setMsgText]        = useState('');
  const [sendingMsg,     setSendingMsg]     = useState(false);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);
  const msgScrollRef = useRef<ScrollView>(null);

  // Internal tab navigation
  const [activeTab, setActiveTab] = useState<'inicio' | 'miembros' | 'chat' | 'viaje'>('inicio');

  useEffect(() => attendanceTracker.subscribe(() => setAttState(attendanceTracker.state)), []);

  useEffect(() => {
    if (activeTab === 'chat' && token && id) loadRoomMessages();
  }, [activeTab, token]);

  // ── Animations ──────────────────────────────────────────────────────────────
  const contentOpacity = useSharedValue(0);
  const contentTransY  = useSharedValue(24);

  useEffect(() => {
    const ease = Easing.out(Easing.ease);
    contentOpacity.value = withTiming(1, { duration: 450, easing: ease });
    contentTransY.value  = withTiming(0, { duration: 450, easing: ease });

    (async () => {
      const [t, uRaw] = await Promise.all([storage.get('token'), storage.get('user')]);
      let parsedUser: any = null;
      if (uRaw) {
        try {
          const parsed = JSON.parse(uRaw);
          setCurrentUser(parsed);
          parsedUser = parsed;
        } catch {}
      }
      if (id) {
        const uid = parsedUser?.id ?? 'guest';
        const savedBio  = await storage.get(`room_bio_${uid}_${id}`);
        const savedGoal = await storage.get(`room_goal_${uid}_${id}`);
        setBioText(savedBio ?? '');
        setGoalText(savedGoal ?? '');
      }
      if (t) {
        setToken(t);
        fetchLeaderboard(t, 'semana', parsedUser);
        if (id) loadServerJourney(t);
        if (id) loadMyAttendance(t);
        if (id) loadPendingAttendances(t);
      }
    })();
  }, []);

  // ── Data loaders ────────────────────────────────────────────────────────────
  const fetchLeaderboard = async (tkn?: string, period?: 'semana' | 'mes' | 'año', user?: any) => {
    const t  = tkn ?? token;
    const p  = period ?? selectedPeriod;
    const cu = user ?? currentUser;
    if (!t || !id) return;
    setLoadingLB(true);
    try {
      const res  = await challengeApi.leaderboard(Number(id), p, t);
      const data = res.data;
      setChallengeName(data.challenge?.name ?? '');
      setCoverImage(getStorageUrl(data.challenge?.cover_image));
      setInviteCode(data.challenge?.invite_code ?? '');
      setChallengeCreatorId(data.challenge?.user_id ?? null);
      setIsPrivate(data.challenge?.is_private ?? false);
      setStartDate(data.challenge?.start_date ?? null);
      setDurationDays(data.challenge?.duration_days ?? 30);
      if (data.challenge?.is_private && String(data.challenge?.user_id) === String(cu?.id)) {
        loadRoomRequests(t);
      }
      setUseLocation(data.challenge?.use_location ?? false);
      setUseCamera(data.challenge?.use_camera ?? false);
      setEnableBets(data.challenge?.enable_bets ?? false);
      setGymLat(data.challenge?.gym_lat ?? null);
      setGymLng(data.challenge?.gym_lng ?? null);
      setGymRadius(data.challenge?.gym_radius_meters ?? 200);
      const parts: Participant[] = data.participants ?? [];
      setLeaderboard(parts);
      if (parts.length > 0) {
        const me = parts.find(m => String(m.id) === String(cu?.id));
        setSelectedMember(prev => {
          if (prev) return parts.find(m => m.id === prev.id) ?? me ?? parts[0];
          return me ?? parts[0];
        });
      }
    } catch { setLeaderboard([]); }
    setLoadingLB(false);
  };

  // ── Attendance ───────────────────────────────────────────────────────────────
  const loadMyAttendance = async (tkn?: string) => {
    const t = tkn ?? token;
    if (!t || !id) return;
    try {
      const res = await attendanceApi.myAttendance(id, t);
      attendanceTracker.syncFromServer(!!res.data.attended_today, res.data.streak ?? 0);
      setPendingToday(res.data.pending_today ?? false);
    } catch {}
  };

  const loadPendingAttendances = async (tkn?: string) => {
    const t = tkn ?? token;
    if (!t || !id) return;
    try {
      const res = await attendanceApi.getPendingAttendances(id, t);
      setPendingAttendances(res.data.pending ?? []);
    } catch {}
  };

  // ── Join requests (sala privada) ─────────────────────────────────────────────
  const loadRoomRequests = async (tkn?: string) => {
    const t = tkn ?? token;
    if (!id || !t) return;
    setLoadingRequests(true);
    try {
      const res = await inviteApi.requests(id, t);
      setRoomRequests(res.data.requests ?? []);
    } catch (e: any) {
      console.log('[Requests] Error al cargar:', e?.response?.status, e?.response?.data);
      setRoomRequests([]);
    }
    setLoadingRequests(false);
  };

  const openRequests = () => {
    setShowRequestsModal(true);
    loadRoomRequests();
  };

  const respondRequest = async (requestId: number, approve: boolean) => {
    if (!id || !token) return;
    setRespondingId(requestId);
    try {
      if (approve) {
        await inviteApi.approveRequest(id, requestId, token);
        setRoomRequests(prev => prev.filter(r => r.id !== requestId));
        Alert.alert(t('roomDetail.approved'), t('roomDetail.approvedMsg'));
      } else {
        await inviteApi.rejectRequest(id, requestId, token);
        setRoomRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.requestError'));
    }
    setRespondingId(null);
  };

  const handleConfirmAttendance = async (attendanceId: number) => {
    const apiToken = token;
    if (!apiToken) return;
    setConfirmingId(attendanceId);
    try {
      await attendanceApi.confirmAttendance(attendanceId, apiToken);
      setPendingAttendances(prev => prev.filter(a => a.id !== attendanceId));
      Alert.alert(t('roomDetail.confirmed'), t('roomDetail.confirmedMsg'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.confirmError'));
    }
    setConfirmingId(null);
  };

  const handleRejectAttendance = async (attendanceId: number) => {
    const apiToken = token;
    if (!apiToken) return;
    setConfirmingId(attendanceId);
    try {
      await attendanceApi.rejectAttendance(attendanceId, apiToken);
      setPendingAttendances(prev => prev.filter(a => a.id !== attendanceId));
      Alert.alert(t('roomDetail.rejected'), t('roomDetail.rejectedMsg'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.rejectError'));
    }
    setConfirmingId(null);
  };

  // ── Journey ──────────────────────────────────────────────────────────────────
  const loadServerJourney = async (tkn?: string) => {
    const t = tkn ?? token;
    if (!t || !id) return;
    try {
      const res = await journeyApi.list(id, t);
      const entries: JourneyEntry[] = (res.data.entries ?? []).map((e: any) => ({
        id:       e.id,
        imageUri: getStorageUrl(e.photo_path) ?? '',
        date:     e.photo_date,
        note:     e.note ?? '',
      }));
      setJourney(entries);
    } catch {}
  };

  // ── Location watching (persistente: sigue aunque salgas de la sala) ────────
  useEffect(() => {
    if (useLocation && gymLat != null && gymLng != null) {
      attendanceTracker.start({ challengeId: Number(id), gymLat, gymLng, gymRadius });
    }
  }, [useLocation, gymLat, gymLng, gymRadius, id]);

  const handleCheckIn = async () => {
    const cur = attendanceTracker.state;
    if (cur.posLat == null || cur.posLng == null || !id) return;
    setCheckingIn(true);
    try {
      const res = await attendanceApi.attend(id, cur.posLat, cur.posLng, token);
      attendanceTracker.markAttended(res.data.streak ?? 0);
      Alert.alert(t('roomDetail.attendanceTitle'), t('roomDetail.streakAlert', { count: res.data.streak }));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.confirmError'));
    } finally { setCheckingIn(false); }
  };

  const handleCameraAttendance = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('roomDetail.cameraRequired'), t('roomDetail.cameraRequiredMsg')); return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front,
    });
    if (result.canceled) return;
    setCameraPhotoUri(result.assets[0].uri);
    setShowCameraPreview(true);
  };

  const confirmCameraAttendance = async () => {
    if (!id || !cameraPhotoUri) return;
    setCheckingIn(true);
    try {
      const res = await attendanceApi.attendCamera(id, cameraPhotoUri, token);
      setShowCameraPreview(false);
      setCameraPhotoUri(null);
      if (res.data.pending_today) {
        setPendingToday(true);
        Alert.alert(t('roomDetail.photoSent'), t('roomDetail.photoSentMsg'));
      } else {
        attendanceTracker.markAttended(res.data.streak ?? 0);
        Alert.alert(t('roomDetail.attendanceTitle'), t('roomDetail.streakAlert', { count: res.data.streak }));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.confirmError'));
    } finally { setCheckingIn(false); }
  };

  const handleSetGymLocation = async () => {
    setShowMenu(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('roomDetail.locationRequired'), t('roomDetail.locationRequiredMsg')); return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await attendanceApi.setGymLocation(id, loc.coords.latitude, loc.coords.longitude, token);
      setGymLat(loc.coords.latitude);
      setGymLng(loc.coords.longitude);
      Alert.alert(t('roomDetail.locationSaved'), t('roomDetail.locationSavedMsg'));
    } catch {
      Alert.alert(t('common.error'), t('roomDetail.locationSaveError'));
    }
  };

  const loadRoomMessages = async () => {
    if (!id || !token) return;
    setLoadingMsgs(true);
    try {
      const res = await messageApi.roomMessages(id, token);
      setRoomMsgs(res.data.messages ?? []);
      setTimeout(() => msgScrollRef.current?.scrollToEnd({ animated: false }), 80);
    } catch {}
    setLoadingMsgs(false);
  };

  const openMessages = () => {
    setShowMsgModal(true);
    loadRoomMessages();
  };

  const sendMessage = async () => {
    const content = msgText.trim();
    if (!content || !id) return;
    setSendingMsg(true);
    setMsgText('');
    try {
      const res = await messageApi.send(id, content, token);
      setRoomMsgs(prev => [...prev, res.data.message]);
      setTimeout(() => msgScrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.msgSendError'));
      setMsgText(content);
    }
    setSendingMsg(false);
  };

  const openJourneyModal = () => {
    const now = new Date();
    setJourneyDay(now.getDate());
    setJourneyMonth(now.getMonth() + 1);
    setJourneyYear(now.getFullYear());
    setNewNote('');
    setNewImgUri(null);
    setShowJourneyModal(true);
  };

  const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const clampJourneyDay = (d: number, m = journeyMonth, y = journeyYear) =>
    Math.min(d, daysInMonth(y, m));

  const pickFromGallery = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('roomDetail.galleryRequired'), t('roomDetail.galleryRequiredMsg')); return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true, aspect: [4, 3], quality: 0.8,
      });
      if (!result.canceled) setNewImgUri(result.assets[0].uri);
    } finally { setPickingImage(false); }
  };

  const pickFromCamera = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('roomDetail.cameraRequired'), t('roomDetail.cameraRequiredMsg')); return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [4, 3], quality: 0.8,
      });
      if (!result.canceled) setNewImgUri(result.assets[0].uri);
    } finally { setPickingImage(false); }
  };

  const saveJourneyEntry = async () => {
    if (!newImgUri || !id) return;
    setSavingJourney(true);
    try {
      const dateStr  = `${journeyYear}-${String(journeyMonth).padStart(2,'0')}-${String(journeyDay).padStart(2,'0')}`;
      const fileName = newImgUri.split('/').pop() ?? 'photo.jpg';
      const ext      = fileName.split('.').pop() ?? 'jpg';
      const form     = new FormData();
      form.append('photo', { uri: newImgUri, name: fileName, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
      form.append('note', newNote.trim());
      form.append('photo_date', dateStr);

      const res   = await journeyApi.create(id, form, token);
      const entry: JourneyEntry = {
        id:       res.data.entry.id,
        imageUri: getStorageUrl(res.data.entry.photo_path) ?? newImgUri,
        date:     res.data.entry.photo_date,
        note:     res.data.entry.note ?? '',
      };
      setJourney(prev => [entry, ...prev]);
      setShowJourneyModal(false);
    } catch {
      Alert.alert(t('common.error'), t('roomDetail.imageSaveError'));
    } finally { setSavingJourney(false); }
  };

  const deleteJourneyEntry = (entryId: number) => {
    Alert.alert(t('roomDetail.deletePhotoTitle'), t('roomDetail.deletePhotoMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          await journeyApi.delete(entryId, token);
          setJourney(prev => prev.filter(e => e.id !== entryId));
        } catch {
          Alert.alert(t('common.error'), t('roomDetail.photoDeleteError'));
        }
      }},
    ]);
  };

  // ── Room edit handlers ───────────────────────────────────────────────────────
  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [inviteCode]);

  const handleEdit = () => { setShowMenu(false); setEditName(challengeName); setEditCoverUri(null); setShowEditModal(true); };

  const handlePickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setEditCoverUri(result.assets[0].uri);
    }
  };

  const handleSaveBio = async () => {
    const uid = currentUser?.id ?? 'guest';
    await storage.set(`room_bio_${uid}_${id}`, bioText);
    await storage.set(`room_goal_${uid}_${id}`, goalText);
    setShowBioModal(false);
  };
  const handleSaveEdit = async () => {
    if (!editName.trim() || !token) return;
    setSavingEdit(true);
    try {
      let res;
      if (editCoverUri) {
        const form = new FormData();
        form.append('name', editName.trim());
        form.append('enable_bets', enableBets ? '1' : '0');
        const fileName = editCoverUri.split('/').pop() ?? 'cover.jpg';
        const ext      = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
        form.append('cover_image', { uri: editCoverUri, name: fileName, type: `image/${ext}` } as any);
        res = await challengeApi.updateWithCover(id, form, token);
      } else {
        res = await challengeApi.update(id, { name: editName.trim(), enable_bets: enableBets } as any, token);
      }
      const updated = res.data.challenge;
      setChallengeName(updated?.name ?? editName.trim());
      if (updated?.enable_bets !== undefined) setEnableBets(!!updated.enable_bets);
      if (updated?.cover_image) setCoverImage(getStorageUrl(updated.cover_image));
      setShowEditModal(false);
    } catch (e: any) { Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.updateError')); }
    setSavingEdit(false);
  };
  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(t('roomDetail.deleteRoomTitle'), t('roomDetail.deleteRoomMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try { await challengeApi.delete(id, token); router.back(); }
        catch (e: any) { Alert.alert(t('common.error'), e?.response?.data?.message ?? t('roomDetail.roomDeleteError')); }
      }},
    ]);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const bf = (w: '400' | '700' | '900') => {
    if (!fontsLoaded) return { fontWeight: w === '400' ? '400' as const : '700' as const };
    if (w === '900') return { fontFamily: 'BarlowCondensed_900Black' };
    if (w === '700') return { fontFamily: 'BarlowCondensed_700Bold' };
    return { fontFamily: 'BarlowCondensed_400Regular' };
  };

  const formatJourneyDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    const months = MONTHS_SHORT[i18nLocale] ?? MONTHS_SHORT.es;
    return `${d} ${months[m - 1]} ${y}`;
  };

  const isCreator = currentUser && challengeCreatorId && Number(currentUser.id) === challengeCreatorId;
  const isOwnCard = selectedMember && String(selectedMember.id) === String(currentUser?.id);
  const topDays   = leaderboard.length > 0 ? Math.max(...leaderboard.map(p => p.attendance_count), 1) : 1;
  const memberPct = selectedMember ? Math.min(100, Math.round((selectedMember.attendance_count / topDays) * 100)) : 0;

  // ── Días restantes del desafío ────────────────────────────────────────────────
  const daysLeft = (() => {
    if (!startDate) return null;
    const [y, m, d] = startDate.split('T')[0].split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  })();
  const challengePct = daysLeft === null
    ? memberPct
    : Math.min(100, Math.max(0, Math.round(((durationDays - daysLeft) / durationDays) * 100)));

  const scrollPad = 40 + Math.max(insets.bottom, 8);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTransY.value }],
  }));

  const QSIZE = (SW - HM * 2 - 12) / 2;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG_DARK }} edges={['bottom']}>
      <StatusBar style="light" />

      {/* ══ HERO (fixed, always visible) ══ */}
      <View style={{ height: 200, position: 'relative' }}>
        <Image source={{ uri: coverImage || HERO_IMAGE }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient
          colors={['rgba(7,7,15,0.35)', 'rgba(7,7,15,0.96)']}
          locations={[0, 0.7]}
          style={[StyleSheet.absoluteFillObject, { justifyContent: 'space-between', padding: HM, paddingBottom: 16 }]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 6 }}>
            <Pressable hitSlop={6} onPress={() => router.back()} style={st.iconBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={handleCopyCode} style={st.codePill}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={11} color={ACCENT} />
                <Text style={st.codePillTxt}>{copied ? t('roomDetail.copied') : inviteCode || '...'}</Text>
              </Pressable>
              {isCreator && isPrivate && (
                <Pressable hitSlop={6} onPress={openRequests} style={[st.iconBtn, { backgroundColor: 'rgba(255,0,102,0.18)', position: 'relative' }]}>
                  <MaterialCommunityIcons name="account-plus-outline" size={18} color={ACCENT} />
                  {roomRequests.length > 0 && <View style={st.reqBadge}><Text style={st.reqBadgeTxt}>{roomRequests.length}</Text></View>}
                </Pressable>
              )}
              {isCreator && (
                <Pressable hitSlop={6} onPress={() => setShowMenu(true)} style={st.iconBtn}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
          <View>
            <Text style={[st.heroTitle, bf('900')]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {challengeName || `SALA #${id}`}
            </Text>
            <View style={st.heroSubRow}>
              <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={st.heroSub}>{t('roomDetail.membersCount', { count: leaderboard.length })}</Text>
              {daysLeft !== null && (
                <>
                  <Text style={st.heroSub}> · </Text>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
                  <Text style={st.heroSub}>{t('roomDetail.daysLeft', { count: daysLeft })}</Text>
                </>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ══ TAB BAR ══ */}
      <View style={st.innerTabBar}>
        {([
          { key: 'inicio',   icon: 'home-outline'        as const, label: 'Inicio' },
          { key: 'miembros', icon: 'people-outline'      as const, label: 'Miembros' },
          { key: 'chat',     icon: 'chatbubbles-outline' as const, label: 'Chat' },
          { key: 'viaje',    icon: 'images-outline'      as const, label: 'Mi Viaje' },
        ]).map(tab => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key as any)} style={st.innerTabItem}>
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? ACCENT : TEXT_MUTED} />
            <Text style={[st.innerTabLabel, activeTab === tab.key && { color: ACCENT }]}>{tab.label}</Text>
            {activeTab === tab.key && <View style={st.innerTabUnderline} />}
          </Pressable>
        ))}
      </View>

      {/* ══ CHAT TAB — full height, no outer scroll ══ */}
      {activeTab === 'chat' && (
        <View style={{ flex: 1, backgroundColor: BG_DARK }}>
          {loadingMsgs ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : roomMsgs.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <MaterialCommunityIcons name="message-outline" size={44} color={TEXT_MUTED} />
              <Text style={{ color: TEXT_MUTED, fontSize: 14 }}>{t('roomDetail.noMessages')}</Text>
            </View>
          ) : (
            <ScrollView
              ref={msgScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: HM, paddingTop: 12, gap: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {roomMsgs.map((m: any) => {
                const isOwn = String(m.sender_id) === String(currentUser?.id);
                const avatarUrl = m.sender_avatar ? getStorageUrl(m.sender_avatar) : null;
                return (
                  <View key={m.id} style={[st.msgRow, isOwn && { flexDirection: 'row-reverse' }]}>
                    <MemberAvatar url={avatarUrl} name={m.sender_name} size={30} />
                    <View style={{ maxWidth: '72%' }}>
                      {!isOwn && (
                        <Text style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: '700', marginBottom: 3, marginLeft: 4 }}>{m.sender_name}</Text>
                      )}
                      <View style={[st.msgBubble, isOwn && { backgroundColor: ACCENT }]}>
                        <Text style={[st.msgBubbleTxt, isOwn && { color: '#fff' }]}>{m.content}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View style={[st.msgInputRow, { marginHorizontal: HM, marginBottom: Math.max(insets.bottom, 12) + 4, marginTop: 8 }]}>
            <TextInput
              style={st.msgInput}
              value={msgText}
              onChangeText={setMsgText}
              placeholder={t('roomDetail.writeMessage')}
              placeholderTextColor={TEXT_MUTED}
              multiline maxLength={500}
              returnKeyType="send" submitBehavior="newline"
            />
            <Pressable
              onPress={sendMessage}
              style={[st.msgSendBtn, (!msgText.trim() || sendingMsg) && { opacity: 0.4 }]}
              disabled={!msgText.trim() || sendingMsg}
            >
              {sendingMsg ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={16} color="#fff" />}
            </Pressable>
          </View>
        </View>
      )}

      {/* ══ SCROLLABLE TABS ══ */}
      {activeTab !== 'chat' && (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPad }}
        style={{ flex: 1, backgroundColor: BG_DARK }}
      >
        <Animated.View style={contentStyle}>

        {/* ════════════ INICIO TAB ════════════ */}
        {activeTab === 'inicio' && (
          <>
            {/* Quick actions 2x2 grid */}
            <View style={{ paddingHorizontal: HM, paddingTop: 20, paddingBottom: 4 }}>
              <Text style={[st.sectionLabel, { marginBottom: 14 }]}>ACCIONES RÁPIDAS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { icon: 'sparkles' as const,        color: '#FF0066', bg: '#FF006618', label: 'WRAPPED',  onPress: () => router.push({ pathname: '/screens/WrappedScreen',     params: { challengeId: String(id), months: '12' } }) },
                  { icon: 'trophy-outline' as const,  color: '#F59E0B', bg: '#F59E0B18', label: 'APUESTA',  onPress: () => router.push({ pathname: '/screens/PledgeScreen', params: { challengeId: String(id), enableBets: String(enableBets), isCreator: String(!!isCreator) } }) },
                  { icon: 'calendar-outline' as const,color: '#22C55E', bg: '#22C55E18', label: 'SEMANA',   onPress: () => router.push({ pathname: '/screens/CommitmentsScreen', params: { challengeId: String(id) } }) },
                  { icon: 'flash-outline' as const,   color: '#60A5FA', bg: '#60A5FA18', label: 'VS SALA',  onPress: () => router.push({ pathname: '/screens/BattleScreen',       params: { challengeId: String(id), challengeName: challengeName || String(id) } }) },
                ].map(({ icon, color, bg, label, onPress }) => (
                  <Pressable key={label} onPress={onPress}
                    style={{ width: QSIZE, backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: color + '30', padding: 16, alignItems: 'center', gap: 10 }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={icon} size={24} color={color} />
                    </View>
                    <Text style={{ color: TEXT_LIGHT, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* My progress (if own card) */}
            {isOwnCard && selectedMember && (
              <View style={{ paddingHorizontal: HM, marginTop: 20 }}>
                <Text style={[st.sectionLabel, { marginBottom: 12 }]}>MI PROGRESO</Text>
                <View style={st.card}>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <View style={[st.statPill, { flex: 1, justifyContent: 'center', borderColor: ACCENT + '40', backgroundColor: ACCENT + '10' }]}>
                      <Ionicons name="calendar-outline" size={15} color={ACCENT} />
                      <Text style={[st.statPillVal, { color: ACCENT }]}>{selectedMember.attendance_count}</Text>
                      <Text style={st.statPillLbl}>{t('roomDetail.days')}</Text>
                    </View>
                    <View style={[st.statPill, { flex: 1, justifyContent: 'center' }]}>
                      <MaterialCommunityIcons name="fire" size={15} color={GOLD} />
                      <Text style={st.statPillVal}>{selectedMember.streak ?? 0}</Text>
                      <Text style={st.statPillLbl}>{t('roomDetail.streak')}</Text>
                    </View>
                  </View>
                  <ProgressBar
                    pct={challengePct}
                    label={t('roomDetail.challengeProgress')}
                    valueText={daysLeft === null ? undefined : t('roomDetail.daysLeft', { count: daysLeft })}
                  />
                  {goalText.length > 0 && (
                    <View style={st.goalChip}>
                      <Ionicons name="flag-outline" size={12} color={ACCENT} />
                      <Text style={{ color: TEXT_SUB, fontSize: 11, flex: 1 }}>{goalText}</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => setShowBioModal(true)}
                    style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER }}
                  >
                    <Ionicons name="pencil-outline" size={14} color={TEXT_SUB} />
                    <Text style={{ color: TEXT_SUB, fontSize: 12, fontWeight: '700' }}>Editar bio y meta</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Attendance — location */}
            {isOwnCard && useLocation && (
              <View style={{ paddingHorizontal: HM, marginTop: 20 }}>
                <Text style={[st.sectionLabel, { marginBottom: 12 }]}>{t('roomDetail.attendance')}</Text>
                <View style={st.card}>
                  {!gymLat ? (
                    <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                      <Ionicons name="location-outline" size={28} color={TEXT_MUTED} />
                      <Text style={{ color: TEXT_MUTED, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                        {isCreator ? t('roomDetail.locationHint') : t('roomDetail.locationNotSet')}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                        <MapView
                          key={`${gymLat}-${gymLng}`}
                          style={{ width: '100%', height: 180 }}
                          initialRegion={{ latitude: gymLat!, longitude: gymLng!, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
                          showsUserLocation showsMyLocationButton={false}
                          scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
                          provider="google" customMapStyle={DARK_MAP_STYLE}
                        >
                          <Circle center={{ latitude: gymLat!, longitude: gymLng! }} radius={gymRadius} fillColor="rgba(255,0,102,0.12)" strokeColor={ACCENT} strokeWidth={2} />
                          <Marker coordinate={{ latitude: gymLat!, longitude: gymLng! }} anchor={{ x: 0.5, y: 1 }}>
                            <View style={{ alignItems: 'center' }}>
                              <View style={{ backgroundColor: ACCENT, borderRadius: 22, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff' }}>
                                <Ionicons name="fitness-outline" size={18} color="#fff" />
                              </View>
                              <View style={{ width: 2, height: 8, backgroundColor: ACCENT }} />
                            </View>
                          </Marker>
                        </MapView>
                      </View>
                      {attState.attendedToday ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#22C55E18', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                          </View>
                          <View>
                            <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 14 }}>{t('roomDetail.checkedInToday')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                              <MaterialCommunityIcons name="fire" size={13} color={GOLD} />
                              <Text style={{ color: TEXT_MUTED, fontSize: 12 }}>{t('roomDetail.streakShort', { count: attState.streak })}</Text>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: attState.inRange ? '#22C55E' : TEXT_SUB }} />
                            <Text style={{ color: attState.inRange ? '#22C55E' : TEXT_SUB, fontSize: 12, fontFamily: FONT_BOLD, letterSpacing: 0.4, flex: 1 }}>
                              {attState.distance === null ? t('roomDetail.gettingLocation') : attState.inRange ? t('roomDetail.inRange', { distance: attState.distance }) : t('roomDetail.farFromGym', { distance: attState.distance })}
                            </Text>
                          </View>
                          {attState.inRange && attState.secondsInRange < REQUIRED_SECONDS && (
                            <View style={{ marginBottom: 14 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ color: TEXT_MUTED, fontSize: 10, fontFamily: FONT_BOLD, letterSpacing: 0.8 }}>{t('roomDetail.timeInRange')}</Text>
                                <Text style={{ color: '#22C55E', fontSize: 11, fontFamily: FONT_BOLD }}>
                                  {(() => { const r = REQUIRED_SECONDS - attState.secondsInRange; return t('roomDetail.timeLeft', { time: `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}` }); })()}
                                </Text>
                              </View>
                              <View style={{ height: 6, backgroundColor: CARD_BORDER, borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{ width: `${(attState.secondsInRange / REQUIRED_SECONDS) * 100}%`, height: 6, backgroundColor: '#22C55E', borderRadius: 3 }} />
                              </View>
                            </View>
                          )}
                          {attState.secondsInRange >= REQUIRED_SECONDS && !attState.attendedToday && (
                            <Pressable
                              style={[{ height: 50, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E' }, checkingIn && { opacity: 0.6 }]}
                              onPress={handleCheckIn} disabled={checkingIn}
                            >
                              {checkingIn ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={{ color: '#fff', fontSize: 14, fontFamily: FONT_BOLD, letterSpacing: 1 }}>{t('roomDetail.checkInBtn')}</Text></>}
                            </Pressable>
                          )}
                          {attState.streak > 0 && <View style={{ marginTop: 12 }}><StreakRow streak={attState.streak} /></View>}
                        </>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Attendance — camera */}
            {isOwnCard && useCamera && (
              <View style={{ paddingHorizontal: HM, marginTop: useLocation ? 12 : 20 }}>
                {!useLocation && <Text style={[st.sectionLabel, { marginBottom: 12 }]}>{t('roomDetail.photoAttendance')}</Text>}
                <View style={st.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="camera" size={14} color={ACCENT} />
                    <Text style={st.sectionLabel}>{t('roomDetail.photoAttendance')}</Text>
                  </View>
                  {attState.attendedToday ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                      <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 14 }}>{t('roomDetail.checkedInToday')}</Text>
                    </View>
                  ) : pendingToday ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name="hourglass-outline" size={22} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 14 }}>{t('roomDetail.photoPending')}</Text>
                        <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>{t('roomDetail.photoPendingDesc')}</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 14 }}>{t('roomDetail.selfieHint')}</Text>
                      {showCameraPreview && cameraPhotoUri && (
                        <View style={{ marginBottom: 14 }}>
                          <Image source={{ uri: cameraPhotoUri }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <Pressable onPress={() => { setShowCameraPreview(false); setCameraPhotoUri(null); }} style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: TEXT_MUTED, fontWeight: '700', fontSize: 13 }}>{t('roomDetail.retake')}</Text>
                            </Pressable>
                            <Pressable onPress={confirmCameraAttendance} disabled={checkingIn} style={[{ flex: 1, height: 44, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }, checkingIn && { opacity: 0.6 }]}>
                              {checkingIn ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 13, fontFamily: FONT_BOLD, letterSpacing: 0.8 }}>{t('roomDetail.sendPhoto')}</Text>}
                            </Pressable>
                          </View>
                        </View>
                      )}
                      {!showCameraPreview && (
                        <Pressable onPress={handleCameraAttendance} style={{ height: 50, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT }}>
                          <Ionicons name="camera-outline" size={20} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONT_BOLD, letterSpacing: 1 }}>{t('roomDetail.takePhoto')}</Text>
                        </Pressable>
                      )}
                      {attState.streak > 0 && <View style={{ marginTop: 12 }}><StreakRow streak={attState.streak} /></View>}
                    </>
                  )}
                  {pendingAttendances.length > 0 && (
                    <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: CARD_BORDER, paddingTop: 16 }}>
                      <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>{t('roomDetail.confirmCompanions')}</Text>
                      {pendingAttendances.map((pa: any) => (
                        <View key={pa.id} style={{ marginBottom: 16 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{(pa.user_name?.[0] ?? '?').toUpperCase()}</Text>
                            </View>
                            <Text style={{ color: TEXT_LIGHT, fontWeight: '700', fontSize: 13 }}>{pa.user_name}</Text>
                          </View>
                          {pa.photo_path && <Image source={{ uri: getStorageUrl(pa.photo_path) ?? undefined }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 10 }} resizeMode="cover" />}
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable onPress={() => handleRejectAttendance(pa.id)} disabled={confirmingId === pa.id} style={[{ flex: 1, height: 44, borderRadius: 12, backgroundColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center' }, confirmingId === pa.id && { opacity: 0.6 }]}>
                              {confirmingId === pa.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 12, fontFamily: FONT_BOLD }}>{t('roomDetail.reject')}</Text>}
                            </Pressable>
                            <Pressable onPress={() => handleConfirmAttendance(pa.id)} disabled={confirmingId === pa.id} style={[{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }, confirmingId === pa.id && { opacity: 0.6 }]}>
                              {confirmingId === pa.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 12, fontFamily: FONT_BOLD }}>{t('roomDetail.confirmInGym')}</Text>}
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        {/* ════════════ MIEMBROS TAB ════════════ */}
        {activeTab === 'miembros' && (
          <>
            {loadingLB ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 32 }} />
            ) : (
              <>
                {/* Compact member selector */}
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: HM, paddingTop: 16, paddingBottom: 12, gap: 10 }}
                >
                  {leaderboard.map(member => {
                    const isSelected = selectedMember?.id === member.id;
                    const isMe = String(member.id) === String(currentUser?.id);
                    const avatarUrl = member.avatar_url ? getStorageUrl(member.avatar_url) : null;
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => { setSelectedMember(member); setCompareMode(false); setCompareTarget(null); }}
                        style={[st.memberTab, isSelected && st.memberTabActive]}
                      >
                        {isSelected && <View style={st.tabGlowRing} />}
                        <MemberAvatar url={avatarUrl} name={member.username} size={60} borderColor={isSelected ? ACCENT : isMe ? ACCENT + '60' : 'rgba(255,255,255,0.08)'} borderWidth={isSelected ? 2.5 : 1.5} />
                        <Text style={[st.tabName, isSelected && { color: ACCENT }]} numberOfLines={1}>{member.username.split(' ')[0]}{isMe ? ' (tú)' : ''}</Text>
                        <Text style={[st.tabPts, isSelected && { color: ACCENT + 'CC' }]}>{member.attendance_count} días</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Selected member card */}
                {selectedMember && (
                  <Animated.View entering={FadeInDown.duration(280)} style={[st.card, { marginHorizontal: HM, marginBottom: 16, overflow: 'hidden' }]}>
                    <LinearGradient colors={[ACCENT + '22', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <MemberAvatar url={selectedMember.avatar_url ? getStorageUrl(selectedMember.avatar_url) : null} name={selectedMember.username} size={64} borderColor={ACCENT} borderWidth={2.5} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Text style={[st.memberName, bf('700')]} numberOfLines={1}>{selectedMember.username}</Text>
                          {isOwnCard && <View style={st.youBadge}><Text style={st.youBadgeTxt}>{t('roomDetail.you')}</Text></View>}
                        </View>
                        {isOwnCard && bioText.length > 0 && (
                          <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 4 }} numberOfLines={2}>{bioText}</Text>
                        )}
                      </View>
                      {!isOwnCard && (
                        <Pressable
                          hitSlop={6}
                          onPress={() => { setCompareTarget(selectedMember); setCompareMode(true); }}
                          style={[st.iconBtnSm, compareMode && { backgroundColor: ACCENT + '20', borderColor: ACCENT + '50' }]}
                        >
                          <Ionicons name="git-compare-outline" size={14} color={compareMode ? ACCENT : TEXT_SUB} />
                        </Pressable>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                      <StatPill icon="calendar-outline" value={selectedMember.attendance_count} label={t('roomDetail.days')} accent />
                      <StatPill icon="flame-outline" value={selectedMember.streak ?? 0} label={t('roomDetail.streak')} />
                    </View>
                    <ProgressBar pct={challengePct} label={t('roomDetail.challengeProgress')} valueText={daysLeft === null ? undefined : t('roomDetail.daysLeft', { count: daysLeft })} />
                    {!isOwnCard && (
                      <Pressable
                        onPress={() => setShowProfileModal(true)}
                        style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER }}
                      >
                        <Ionicons name="person-outline" size={14} color={TEXT_SUB} />
                        <Text style={{ color: TEXT_SUB, fontSize: 12, fontWeight: '700' }}>{t('roomDetail.viewProfile')}</Text>
                      </Pressable>
                    )}
                  </Animated.View>
                )}

                {/* Compare */}
                {compareMode && compareTarget && (() => {
                  const me = leaderboard.find(p => String(p.id) === String(currentUser?.id));
                  if (!me) return null;
                  return (
                    <Animated.View entering={FadeInDown.duration(300)} style={[st.card, { marginHorizontal: HM, marginBottom: 16 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <Ionicons name="git-compare-outline" size={15} color={ACCENT} />
                        <Text style={[st.sectionLabel, { marginBottom: 0 }]}>{t('roomDetail.compare')}</Text>
                        <View style={{ flex: 1 }} />
                        <Pressable hitSlop={8} onPress={() => { setCompareMode(false); setCompareTarget(null); }}>
                          <Ionicons name="close-circle" size={20} color={TEXT_MUTED} />
                        </Pressable>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 18 }}>
                        <View style={{ alignItems: 'center', gap: 5 }}>
                          <MemberAvatar url={me.avatar_url ? getStorageUrl(me.avatar_url) : null} name={me.username} size={50} borderColor={ACCENT} borderWidth={2} />
                          <Text style={{ color: TEXT_LIGHT, fontSize: 11, fontWeight: '700' }}>{me.username.split(' ')[0]}</Text>
                          <View style={st.youBadge}><Text style={st.youBadgeTxt}>{t('roomDetail.you')}</Text></View>
                        </View>
                        <View style={st.vsCircle}><Text style={{ color: ACCENT, fontWeight: '900', fontSize: 16 }}>{t('roomDetail.vs')}</Text></View>
                        <View style={{ alignItems: 'center', gap: 5 }}>
                          <MemberAvatar url={compareTarget.avatar_url ? getStorageUrl(compareTarget.avatar_url) : null} name={compareTarget.username} size={50} />
                          <Text style={{ color: TEXT_LIGHT, fontSize: 11, fontWeight: '700' }}>{compareTarget.username.split(' ')[0]}</Text>
                        </View>
                      </View>
                      <CompareRow label={t('roomDetail.rowSessions')} a={me.sessions} b={compareTarget.sessions} aName={me.username} bName={compareTarget.username} />
                      <CompareRow label={t('roomDetail.rowReps')} a={me.total_reps} b={compareTarget.total_reps} aName={me.username} bName={compareTarget.username} />
                    </Animated.View>
                  );
                })()}

                {/* Period + Leaderboard */}
                <View style={{ paddingHorizontal: HM }}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    {(['semana', 'mes', 'año'] as const).map(p => (
                      <Pressable key={p} onPress={() => { setSelectedPeriod(p); fetchLeaderboard(token, p); }} style={[st.filterBtn, selectedPeriod === p && { backgroundColor: ACCENT }]}>
                        <Text style={[st.filterTxt, selectedPeriod === p && { color: '#fff' }]}>
                          {p === 'semana' ? t('roomDetail.periodWeek') : p === 'mes' ? t('roomDetail.periodMonth') : t('roomDetail.periodYear')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[st.sectionLabel, { marginBottom: 12 }]}>{t('roomDetail.leaderboard')}</Text>
                  {leaderboard.map(p => {
                    const isMe = String(p.id) === String(currentUser?.id);
                    const avatarUrl = p.avatar_url ? getStorageUrl(p.avatar_url) : null;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => { setSelectedMember(p); setCompareMode(false); setCompareTarget(null); }}
                        style={[st.participantCard, isMe && { borderColor: ACCENT + '50', backgroundColor: ACCENT + '08' }]}
                      >
                        <MemberAvatar url={avatarUrl} name={p.username} size={36} borderColor={isMe ? ACCENT : 'transparent'} borderWidth={isMe ? 1.5 : 0} />
                        <Text style={[st.participantName, bf('700'), isMe && { color: ACCENT }]} numberOfLines={1}>
                          {p.username}{isMe ? ` (${t('common.you')})` : ''}
                        </Text>
                        <View style={st.pStats}>
                          <View style={{ alignItems: 'center' }}>
                            <Text style={st.pStatVal}>{p.attendance_count}</Text>
                            <Text style={st.pStatLbl}>{t('roomDetail.days')}</Text>
                          </View>
                          <View style={st.pDivider} />
                          <View style={{ alignItems: 'center' }}>
                            <Text style={st.pStatVal}>{p.streak ?? 0}</Text>
                            <Text style={st.pStatLbl}>{t('roomDetail.streak')}</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {/* ════════════ MI VIAJE TAB ════════════ */}
        {activeTab === 'viaje' && (
          <View style={{ paddingHorizontal: HM, paddingTop: 16 }}>
            {!isOwnCard ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
                <Ionicons name="images-outline" size={40} color={TEXT_MUTED} />
                <Text style={{ color: TEXT_MUTED, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                  El viaje es personal. Selecciona tu propio perfil para ver tu progreso.
                </Text>
                <Pressable
                  onPress={() => {
                    const me = leaderboard.find(p => String(p.id) === String(currentUser?.id));
                    if (me) { setSelectedMember(me); setCompareMode(false); }
                  }}
                  style={{ marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER }}
                >
                  <Text style={{ color: TEXT_SUB, fontWeight: '700', fontSize: 13 }}>Ver mi perfil</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View>
                    <Text style={st.sectionLabel}>{t('roomDetail.myJourney')}</Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 3 }}>{t('roomDetail.myJourneyDesc')}</Text>
                  </View>
                  <Pressable onPress={openJourneyModal} style={st.addJourneyBtn}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, fontFamily: FONT_BOLD, letterSpacing: 0.8 }}>{t('roomDetail.add')}</Text>
                  </Pressable>
                </View>
                {journey.length === 0 ? (
                  <Pressable onPress={openJourneyModal} style={st.journeyEmpty}>
                    <LinearGradient colors={[ACCENT + '10', '#6B35FF10']} style={StyleSheet.absoluteFillObject} />
                    <View style={st.journeyEmptyIcon}>
                      <MaterialCommunityIcons name="image-plus" size={36} color={ACCENT} />
                    </View>
                    <Text style={{ color: TEXT_LIGHT, fontSize: 16, fontFamily: FONT_BOLD, letterSpacing: 0.4, marginTop: 12 }}>{t('roomDetail.journeyEmptyTitle')}</Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{t('roomDetail.journeyEmptyDesc')}</Text>
                    <View style={[st.addJourneyBtn, { marginTop: 14 }]}>
                      <Ionicons name="camera" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 11, fontFamily: FONT_BOLD, letterSpacing: 0.8 }}>{t('roomDetail.firstPhoto')}</Text>
                    </View>
                  </Pressable>
                ) : (
                  <View style={st.journeyGrid}>
                    {journey.map((entry, idx) => (
                      <Pressable key={entry.id} style={[st.journeyCard, idx % 2 === 0 && { marginRight: 8 }]} onLongPress={() => deleteJourneyEntry(entry.id)}>
                        <Image source={{ uri: entry.imageUri }} style={st.journeyImg} contentFit="cover" />
                        <LinearGradient colors={['transparent', 'rgba(7,7,15,0.9)']} style={st.journeyOverlay} />
                        <View style={st.journeyDateChip}>
                          <Ionicons name="calendar-outline" size={9} color={ACCENT} />
                          <Text style={st.journeyDateTxt}>{formatJourneyDate(entry.date)}</Text>
                        </View>
                        {entry.note.length > 0 && <Text style={st.journeyNote} numberOfLines={2}>{entry.note}</Text>}
                        {idx === journey.length - 1 && <View style={st.journeyBadge}><Text style={st.journeyBadgeTxt}>{t('roomDetail.journeyStart')}</Text></View>}
                        {idx === 0 && journey.length > 1 && <View style={[st.journeyBadge, { backgroundColor: ACCENT }]}><Text style={st.journeyBadgeTxt}>{t('roomDetail.journeyNow')}</Text></View>}
                      </Pressable>
                    ))}
                  </View>
                )}
                {journey.length > 0 && (
                  <Text style={{ color: TEXT_MUTED, fontSize: 10, textAlign: 'center', marginTop: 4, marginBottom: 4 }}>
                    {t('roomDetail.holdToDelete', { count: journey.length })}
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        </Animated.View>
      </ScrollView>
      )}

      {/* ══ MODALS ══ */}

      {/* ══════════════════════════════════════════════════════════════════
          PERFIL DE OTRO MIEMBRO
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showProfileModal} transparent animationType="slide" onRequestClose={() => setShowProfileModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }} onPress={() => setShowProfileModal(false)}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={[st.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24), paddingTop: 24 }]}>
              <View style={st.sheetHandle} />

              {selectedMember && (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <MemberAvatar
                      url={selectedMember.avatar_url ? getStorageUrl(selectedMember.avatar_url) : null}
                      name={selectedMember.username}
                      size={80}
                      borderColor={ACCENT}
                      borderWidth={2.5}
                    />
                    <Text style={[{ color: TEXT_LIGHT, fontSize: 20, marginTop: 12 }, bf('700')]}>{selectedMember.username}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: t('roomDetail.roomGymDays'), value: selectedMember.attendance_count },
                      { label: t('roomDetail.roomStreak'),  value: selectedMember.streak ?? 0 },
                    ].map(({ label, value }) => (
                      <View key={label} style={{ flex: 1, backgroundColor: CARD_BG, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: CARD_BORDER }}>
                        <Text style={[{ color: TEXT_LIGHT, fontSize: 18 }, bf('700')]}>{value}</Text>
                        <Text style={{ color: TEXT_MUTED, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 }}>{label}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => setShowProfileModal(false)}
                    style={{ height: 48, borderRadius: 14, backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: TEXT_SUB, fontWeight: '700' }}>{t('common.close')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          JOURNEY ADD MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showJourneyModal} transparent animationType="slide" onRequestClose={() => setShowJourneyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={[st.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {/* Handle */}
            <View style={st.sheetHandle} />
            <Text style={[st.sheetTitle, bf('700')]}>{t('roomDetail.addJourney')}</Text>

            {/* Image preview / picker */}
            {newImgUri ? (
              <View style={{ position: 'relative', marginBottom: 16 }}>
                <Image source={{ uri: newImgUri }} style={st.previewImg} contentFit="cover" />
                <Pressable
                  onPress={() => setNewImgUri(null)}
                  style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14, padding: 4 }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
                <LinearGradient
                  colors={['transparent', 'rgba(15,15,26,0.7)']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <Pressable style={st.pickerBtn} onPress={pickFromCamera} disabled={pickingImage}>
                  <LinearGradient colors={[ACCENT, '#C0004D']} style={StyleSheet.absoluteFillObject} />
                  {pickingImage
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="camera" size={24} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 6 }}>{t('roomDetail.camera')}</Text>
                      </>
                  }
                </Pressable>
                <Pressable style={[st.pickerBtn, { backgroundColor: CARD_BG2 }]} onPress={pickFromGallery} disabled={pickingImage}>
                  {pickingImage
                    ? <ActivityIndicator color={ACCENT} />
                    : <>
                        <Ionicons name="images-outline" size={24} color={ACCENT} />
                        <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', marginTop: 6 }}>{t('roomDetail.gallery')}</Text>
                      </>
                  }
                </Pressable>
              </View>
            )}

            {/* Date picker */}
            <Text style={[st.inputLabel, { marginBottom: 12, textAlign: 'center' }]}>{t('roomDetail.achievementDate')}</Text>
            <View style={st.datePickerRow}>
              <DateWheel label={t('roomDetail.day')}   value={journeyDay}   min={1} max={31} onChange={setJourneyDay} />
              <View style={{ width: 1, backgroundColor: CARD_BORDER, marginVertical: 8 }} />
              <DateWheel label={t('roomDetail.month')}   value={journeyMonth} min={1} max={12} onChange={m => { setJourneyMonth(m); setJourneyDay(clampJourneyDay(journeyDay, m)); }}
                format={v => MONTHS_SHORT[i18nLocale]?.[v - 1] ?? String(v)} />
              <View style={{ width: 1, backgroundColor: CARD_BORDER, marginVertical: 8 }} />
              <DateWheel label={t('roomDetail.year')}   value={journeyYear}  min={2020} max={new Date().getFullYear()} onChange={y => { setJourneyYear(y); setJourneyDay(clampJourneyDay(journeyDay, journeyMonth, y)); }}
                format={v => String(v)} />
            </View>

            {/* Note */}
            <Text style={[st.inputLabel, { marginTop: 14, marginBottom: 6 }]}>{t('roomDetail.noteOptional')}</Text>
            <TextInput
              style={[st.input, { marginBottom: 18, textAlign: 'left', paddingHorizontal: 14 }]}
              value={newNote}
              onChangeText={setNewNote}
              placeholder={t('roomDetail.notePlaceholder')}
              placeholderTextColor={TEXT_MUTED}
              maxLength={120}
            />

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[st.sheetBtn, { backgroundColor: CARD_BG2 }]} onPress={() => setShowJourneyModal(false)}>
<Text style={st.sheetBtnTxt}>{t('common.cancel').toUpperCase()}</Text>
              </Pressable>
              <Pressable
                style={[st.sheetBtn, { backgroundColor: ACCENT }, (!newImgUri || savingJourney) && { opacity: 0.4 }]}
                onPress={saveJourneyEntry}
                disabled={!newImgUri || savingJourney}
              >
                {savingJourney
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={st.sheetBtnTxt}>{t('common.save').toUpperCase()}</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          OPTIONS MENU
      ══════════════════════════════════════════════════════════════════ */}
      {showMenu && (
        <Pressable style={st.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={st.menuSheet}>
            <Pressable style={st.menuOption} onPress={handleEdit}>
              <Ionicons name="pencil-outline" size={18} color={TEXT_LIGHT} />
              <Text style={st.menuOptionTxt}>{t('roomDetail.editRoom')}</Text>
            </Pressable>
            {useLocation && (
              <>
                <View style={{ height: 1, backgroundColor: CARD_BORDER }} />
                <Pressable style={st.menuOption} onPress={handleSetGymLocation}>
                  <Ionicons name="location-outline" size={18} color={TEXT_LIGHT} />
                  <Text style={st.menuOptionTxt}>{gymLat ? t('roomDetail.updateGymLocation') : t('roomDetail.setGymLocation')}</Text>
                </Pressable>
              </>
            )}
            <View style={{ height: 1, backgroundColor: CARD_BORDER }} />
            <Pressable style={st.menuOption} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={ACCENT} />
              <Text style={[st.menuOptionTxt, { color: ACCENT }]}>{t('roomDetail.deleteRoom')}</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MENSAJES DE SALA
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showMsgModal} transparent animationType="slide" onRequestClose={() => setShowMsgModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={[st.bottomSheet, { paddingBottom: Math.max(insets.bottom, 12), maxHeight: '85%' }]}>
            <View style={st.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[st.sheetTitle, bf('700')]}>{t('roomDetail.messages', { name: challengeName })}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('roomDetail.closeMessages')} onPress={() => setShowMsgModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </Pressable>
            </View>

            {loadingMsgs ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            ) : roomMsgs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <MaterialCommunityIcons name="message-outline" size={36} color={TEXT_MUTED} />
                <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>{t('roomDetail.noMessages')}</Text>
              </View>
            ) : (
              <ScrollView
                ref={msgScrollRef}
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8, gap: 10 }}
              >
                {roomMsgs.map((m: any) => {
                  const isOwn = String(m.sender_id) === String(currentUser?.id);
                  const avatarUrl = m.sender_avatar ? getStorageUrl(m.sender_avatar) : null;
                  return (
                    <View key={m.id} style={[st.msgRow, isOwn && { flexDirection: 'row-reverse' }]}>
                      <MemberAvatar url={avatarUrl} name={m.sender_name} size={30} />
                      <View style={{ maxWidth: '72%' }}>
                        {!isOwn && (
                          <Text style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: '700', marginBottom: 3, marginLeft: 4 }}>
                            {m.sender_name}
                          </Text>
                        )}
                        <View style={[st.msgBubble, isOwn && { backgroundColor: ACCENT }]}>
                          <Text style={[st.msgBubbleTxt, isOwn && { color: '#fff' }]}>{m.content}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={[st.msgInputRow, { marginTop: 12 }]}>
              <TextInput
                style={st.msgInput}
                value={msgText}
                onChangeText={setMsgText}
                placeholder={t('roomDetail.writeMessage')}
                placeholderTextColor={TEXT_MUTED}
                multiline
                maxLength={500}
                returnKeyType="send"
                submitBehavior="newline"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('roomDetail.sendMsgA11y')}
                onPress={sendMessage}
                style={[st.msgSendBtn, (!msgText.trim() || sendingMsg) && { opacity: 0.4 }]}
                disabled={!msgText.trim() || sendingMsg}
              >
                {sendingMsg
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="send" size={16} color="#fff" />
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          SOLICITUDES DE INGRESO (sala privada)
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showRequestsModal} transparent animationType="slide" onRequestClose={() => setShowRequestsModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={[st.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20), maxHeight: '80%' }]}>
            <View style={st.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={[st.sheetTitle, bf('700'), { marginBottom: 0 }]}>{t('roomDetail.requestsTitle')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('roomDetail.closeRequests')} onPress={() => setShowRequestsModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </Pressable>
            </View>
            <Text style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 16, lineHeight: 16 }}>
              {t('roomDetail.requestsDesc')}
            </Text>

            {loadingRequests ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            ) : roomRequests.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
                <MaterialCommunityIcons name="account-check-outline" size={34} color={TEXT_MUTED} />
                <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>{t('roomDetail.noRequests')}</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {roomRequests.map((rq: any) => (
                  <View key={rq.id} style={st.reqCard}>
                    <MemberAvatar
                      url={rq.user?.avatar ? getStorageUrl(rq.user.avatar) : null}
                      name={rq.user?.name ?? '?'}
                      size={42}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: TEXT_LIGHT, fontSize: 14, fontWeight: '700' }}>{rq.user?.name ?? t('roomDetail.user')}</Text>
                      <Text style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 2 }}>
                        {t('roomDetail.requestedOn', { date: new Date(rq.created_at).toLocaleDateString(i18nLocale === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' }) })}
                      </Text>
                    </View>
                    {respondingId === rq.id ? (
                      <ActivityIndicator color={ACCENT} size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => respondRequest(rq.id, false)}
                          style={[st.reqBtn, { backgroundColor: CARD_BORDER }]}
                        >
                          <Ionicons name="close" size={16} color={TEXT_SUB} />
                        </Pressable>
                        <Pressable
                          onPress={() => respondRequest(rq.id, true)}
                          style={[st.reqBtn, { backgroundColor: '#22C55E' }]}
                        >
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          EDIT ROOM MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }} onPress={() => setShowEditModal(false)}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={[st.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={st.sheetHandle} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={[st.sheetTitle, bf('700')]}>Editar sala</Text>
                <Pressable onPress={() => setShowEditModal(false)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={TEXT_MUTED} />
                </Pressable>
              </View>

              {/* Cover photo picker */}
              <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Foto de portada</Text>
              <Pressable onPress={handlePickCover} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, height: 140 }}>
                {editCoverUri || coverImage ? (
                  <View style={{ flex: 1 }}>
                    <Image
                      source={{ uri: editCoverUri || coverImage || '' }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="cover"
                    />
                    <LinearGradient colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFillObject} />
                    <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Ionicons name="camera-outline" size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Cambiar foto</Text>
                    </View>
                    {editCoverUri && (
                      <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: ACCENT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>NUEVA</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ flex: 1, backgroundColor: CARD_BG2, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: CARD_BORDER, borderStyle: 'dashed', borderRadius: 16 }}>
                    <Ionicons name="image-outline" size={32} color={TEXT_MUTED} />
                    <Text style={{ color: TEXT_MUTED, fontSize: 13, fontWeight: '600' }}>Agregar foto de portada</Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 11, opacity: 0.6 }}>Toca para seleccionar de tu galería</Text>
                  </View>
                )}
              </Pressable>

              {/* Name field */}
              <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Nombre de la sala</Text>
              <TextInput
                style={[st.input, { marginBottom: 20, paddingHorizontal: 14 }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre de la sala"
                placeholderTextColor={TEXT_MUTED}
                maxLength={50}
                autoCorrect={false}
              />

              {/* Apuestas sociales toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG2, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: CARD_BORDER }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TEXT_LIGHT, fontWeight: '700', fontSize: 14, marginBottom: 3 }}>Apuestas entre miembros</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 17 }}>
                    Permite que los miembros hagan predicciones entre ellos
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEnableBets(v => !v)}
                  style={[
                    { width: 48, height: 26, borderRadius: 13, justifyContent: 'center', padding: 3 },
                    enableBets ? { backgroundColor: ACCENT } : { backgroundColor: CARD_BORDER },
                  ]}
                >
                  <View style={[
                    { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
                    enableBets ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                  ]} />
                </Pressable>
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: CARD_BG2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: CARD_BORDER }}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={{ color: TEXT_SUB, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 2, height: 48, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', opacity: (!editName.trim() || savingEdit) ? 0.5 : 1 }}
                  onPress={handleSaveEdit}
                  disabled={!editName.trim() || savingEdit}
                >
                  {savingEdit
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Guardar cambios</Text>
                  }
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          BIO / GOAL MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showBioModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={[st.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={st.sheetHandle} />
            <Text style={[st.sheetTitle, bf('700')]}>{t('roomDetail.roomProfileTitle')}</Text>
            <Text style={[st.inputLabel, { marginBottom: 6 }]}>{t('roomDetail.bio')}</Text>
            <TextInput
              style={[st.input, { height: 72, textAlignVertical: 'top', paddingTop: 10, textAlign: 'left', paddingHorizontal: 14, marginBottom: 14 }]}
              value={bioText} onChangeText={setBioText}
              placeholder={t('roomDetail.bioPlaceholder')} placeholderTextColor={TEXT_MUTED}
              multiline autoFocus maxLength={150}
            />
            <Text style={[st.inputLabel, { marginBottom: 6 }]}>{t('roomDetail.goalTitle')}</Text>
            <TextInput
              style={[st.input, { textAlign: 'left', paddingHorizontal: 14, marginBottom: 18 }]}
              value={goalText} onChangeText={setGoalText}
              placeholder={t('roomDetail.goalPlaceholder')} placeholderTextColor={TEXT_MUTED}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[st.sheetBtn, { backgroundColor: CARD_BG2 }]} onPress={() => setShowBioModal(false)}>
                <Text style={st.sheetBtnTxt}>{t('common.cancel').toUpperCase()}</Text>
              </Pressable>
              <Pressable
                style={[st.sheetBtn, { backgroundColor: ACCENT }]}
                onPress={handleSaveBio}
              >
                <Text style={st.sheetBtnTxt}>{t('common.save').toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_W = (SW - HM * 2 - 8) / 2;

const st = StyleSheet.create({
  // ── Buttons ──────────────────────────────────────────────────────────────────
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(15,15,26,0.8)', borderWidth: 1, borderColor: CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnSm: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: CARD_BG2, borderWidth: 1, borderColor: CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  innerTabBar: {
    flexDirection: 'row',
    backgroundColor: BG_DARK,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
  },
  innerTabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2, position: 'relative',
  },
  innerTabLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: TEXT_MUTED,
  },
  innerTabUnderline: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, borderRadius: 2, backgroundColor: ACCENT,
  },
  codePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(15,15,26,0.85)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: ACCENT,
  },
  codePillTxt: { fontSize: 10, color: ACCENT, fontWeight: '700', fontFamily: FONT_BOLD, letterSpacing: 0.8 },
  reqBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  reqBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: ACCENT,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6,
  },
  heroBadgeTxt: { fontSize: 10, color: ACCENT, fontWeight: '700', fontFamily: FONT_BOLD, letterSpacing: 1 },
  heroTitle:    { fontSize: 38, color: '#fff', letterSpacing: 1.5, lineHeight: 42 },
  heroSubRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroSub:      { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: FONT_BOLD, letterSpacing: 0.6 },

  // ── Member tabs section ───────────────────────────────────────────────────────
  tabsSection: {
    backgroundColor: CARD_BG,
    borderBottomWidth: 1, borderBottomColor: CARD_BORDER,
    paddingTop: 20, paddingBottom: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: HM,
    gap: 12,
    alignItems: 'flex-start',
  },
  memberTab: {
    alignItems: 'center', gap: 8,
    paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: 20, minWidth: 90,
    backgroundColor: CARD_BG2,
    borderWidth: 1, borderColor: CARD_BORDER,
    position: 'relative',
  },
  memberTabActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '0D',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  tabGlowRing: {
    position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 22, borderWidth: 1.5, borderColor: ACCENT + '30',
  },
  tabRankBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: CARD_BG, borderRadius: 10, padding: 1,
    zIndex: 1,
  },
  tabName: {
    color: TEXT_LIGHT, fontSize: 13, fontFamily: FONT_BOLD, letterSpacing: 0.4,
    textAlign: 'center', marginTop: 2,
  },
  tabPts: {
    color: TEXT_MUTED, fontSize: 12, fontWeight: '600', fontFamily: FONT_BOLD,
  },

  // ── Section label ────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10, color: TEXT_SUB, letterSpacing: 1.5,
    textTransform: 'uppercase', fontWeight: '800', fontFamily: FONT_BOLD,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG, borderRadius: 18,
    borderWidth: 1, borderColor: CARD_BORDER, padding: 16,
  },

  // ── Member profile card ───────────────────────────────────────────────────────
  memberName: { fontSize: 20, color: TEXT_LIGHT, letterSpacing: 0.3 },
  youBadge:   { backgroundColor: ACCENT + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  youBadgeTxt:{ color: ACCENT, fontSize: 9, fontFamily: FONT_BOLD, letterSpacing: 1 },
  rankBadge:  {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: CARD_BG2, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: CARD_BORDER,
    marginTop: 4,
  },
  rankBadgeTxt:{ color: TEXT_SUB, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: CARD_BG2, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: CARD_BORDER, marginTop: 8,
  },

  // ── Stat pill ─────────────────────────────────────────────────────────────────
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CARD_BG2, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  statPillVal: { color: TEXT_LIGHT, fontSize: 15, fontWeight: '800', fontFamily: FONT_BOLD, letterSpacing: 0.5 },
  statPillLbl: { color: TEXT_MUTED, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Progress ─────────────────────────────────────────────────────────────────
  progLabel: { color: TEXT_SUB, fontSize: 10, fontWeight: '700', fontFamily: FONT_BOLD, letterSpacing: 0.8, textTransform: 'uppercase' },
  progTrack: { height: 6, backgroundColor: CARD_BORDER, borderRadius: 3, overflow: 'hidden' },
  progFill:  { height: 6, backgroundColor: ACCENT, borderRadius: 3 },

  // ── Compare ───────────────────────────────────────────────────────────────────
  vsCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ACCENT + '12', borderWidth: 1.5, borderColor: ACCENT + '35',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Filter ───────────────────────────────────────────────────────────────────
  filterBtn: {
    flex: 1, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
  },
  filterTxt: { fontSize: 11, fontWeight: '700', fontFamily: FONT_BOLD, letterSpacing: 1.2, color: TEXT_MUTED },

  // ── Leaderboard row ───────────────────────────────────────────────────────────
  participantCard: {
    backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1,
    borderColor: CARD_BORDER, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  rankNumBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: CARD_BG2, alignItems: 'center', justifyContent: 'center',
  },
  rankNum: { color: TEXT_SUB, fontSize: 12, fontFamily: FONT_BOLD, letterSpacing: 0.2 },
  participantName: { fontSize: 14, color: TEXT_LIGHT, fontFamily: FONT_BOLD, letterSpacing: 0.4, flex: 1 },
  pStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pStatVal: { fontSize: 13, color: TEXT_LIGHT, fontWeight: '700', fontFamily: FONT_BOLD, textAlign: 'center' },
  pStatLbl: { fontSize: 9, color: TEXT_MUTED, letterSpacing: 0.6, fontFamily: FONT_BOLD, textTransform: 'uppercase', textAlign: 'center' },
  pDivider: { width: 1, height: 22, backgroundColor: CARD_BORDER },

  // ── Journey ───────────────────────────────────────────────────────────────────
  addJourneyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  journeyEmpty: {
    borderRadius: 20, borderWidth: 1.5, borderColor: CARD_BORDER,
    borderStyle: 'dashed', padding: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD_BG, overflow: 'hidden',
  },
  journeyEmptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: ACCENT + '15', borderWidth: 1.5, borderColor: ACCENT + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  journeyGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  journeyCard: {
    width: CARD_W, marginBottom: 8,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: CARD_BORDER,
    backgroundColor: CARD_BG2,
  },
  journeyImg: {
    width: '100%', height: 160,
  },
  journeyOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
  },
  journeyDateChip: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(7,7,15,0.85)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  journeyDateTxt: { color: TEXT_LIGHT, fontSize: 9, fontFamily: FONT_BOLD, letterSpacing: 0.3 },
  journeyNote: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    color: 'rgba(240,240,245,0.85)', fontSize: 10, fontWeight: '600', lineHeight: 14,
  },
  journeyBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: CARD_BG2, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  journeyBadgeTxt: { color: TEXT_LIGHT, fontSize: 8, fontFamily: FONT_BOLD, letterSpacing: 0.8 },

  // ── Progress form ─────────────────────────────────────────────────────────────
  inputLabel: { fontSize: 10, color: TEXT_SUB, fontFamily: FONT_BOLD, letterSpacing: 1.2, textTransform: 'uppercase' },
  input: {
    backgroundColor: BG_DARK, borderRadius: 12, height: 46,
    paddingHorizontal: 12, fontSize: 16, color: TEXT_LIGHT,
    fontWeight: '700', textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: ACCENT,
  },
  // ── Menu ─────────────────────────────────────────────────────────────────────

  // ── Menu ─────────────────────────────────────────────────────────────────────
  menuOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end', zIndex: 100 },
  menuSheet:   { backgroundColor: CARD_BG, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 44 },
  menuOption:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuOptionTxt:{ fontSize: 15, color: TEXT_LIGHT, fontWeight: '600' },

  // ── Bottom sheet ─────────────────────────────────────────────────────────────
  bottomSheet: {
    backgroundColor: CARD_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: CARD_BORDER,
    padding: 24,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: CARD_BORDER,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, color: ACCENT, fontFamily: FONT_BOLD, letterSpacing: 1.4, marginBottom: 18 },
  sheetBtn:   { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetBtnTxt:{ fontSize: 12, color: '#fff', fontFamily: FONT_BOLD, letterSpacing: 1.2 },

  // ── Date wheel picker ────────────────────────────────────────────────────────
  datePickerRow: {
    flexDirection: 'row', backgroundColor: CARD_BG2,
    borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  wheelArrow: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center',
  },
  wheelValue: {
    color: TEXT_LIGHT, fontSize: 22, fontFamily: FONT_BOLD, letterSpacing: 0.5,
    textAlign: 'center', marginVertical: 8,
  },

  // ── Preview image ─────────────────────────────────────────────────────────────
  previewImg: {
    width: '100%', height: 180, borderRadius: 16,
  },
  pickerBtn: {
    flex: 1, height: 100, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', gap: 0,
    borderWidth: 1, borderColor: CARD_BORDER,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: CARD_BG, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: CARD_BORDER },
  modalTitle: { fontSize: 16, color: ACCENT, fontFamily: FONT_BOLD, letterSpacing: 1.4, marginBottom: 16 },
  modalInput: {
    backgroundColor: BG_DARK, borderRadius: 12, height: 48, paddingHorizontal: 14,
    fontSize: 15, color: TEXT_LIGHT, fontWeight: '600',
    borderBottomWidth: 2, borderBottomColor: ACCENT, marginBottom: 20,
  },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnTxt: { fontSize: 12, color: '#fff', fontFamily: FONT_BOLD, letterSpacing: 1.2 },
  // ── Messages ──────────────────────────────────────────────────────────────────
  msgRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgBubble:    { backgroundColor: CARD_BG2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  msgBubbleTxt: { color: TEXT_LIGHT, fontSize: 14, lineHeight: 20 },
  msgInputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: CARD_BORDER, paddingTop: 12 },
  msgInput:     { flex: 1, backgroundColor: CARD_BG2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: TEXT_LIGHT, fontSize: 14, maxHeight: 100 },
  msgSendBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  // ── Requests ────────────────────────────────────────────────────────────────
  reqCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD_BG2, borderRadius: 14,
    borderWidth: 1, borderColor: CARD_BORDER, padding: 12,
  },
  reqBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
