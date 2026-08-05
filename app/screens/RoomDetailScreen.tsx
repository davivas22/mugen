import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
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
  Easing, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import {
  useFonts,
  BarlowCondensed_400Regular,
  BarlowCondensed_700Bold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { challengeApi, journeyApi, attendanceApi, messageApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT       = '#FF0066';
const BG_DARK      = '#07070F';
const CARD_BG      = '#0F0F1A';
const CARD_BG2     = '#141424';
const CARD_BORDER  = '#1E1E30';
const TEXT_LIGHT   = '#F0F0F5';
const TEXT_SUB     = '#6B6B8A';
const TEXT_MUTED   = '#4A4A6A';
const HM           = 16;
const { width: SW }= Dimensions.get('window');

const HERO_IMAGE = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=85&auto=format&fit=crop';
const MONTHS     = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
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
  rank: number; points: number; sessions: number; total_reps: number; attendance_count: number;
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

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(pct, { duration: 900 }); }, [pct]);
  const barW = useAnimatedStyle(() => ({ width: `${w.value}%` as any }));
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={st.progLabel}>{label}</Text>
        <Text style={[st.progLabel, { color: ACCENT }]}>{Math.round(pct)}%</Text>
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

  const [fontsLoaded] = useFonts({
    BarlowCondensed_400Regular, BarlowCondensed_700Bold, BarlowCondensed_900Black,
  });

  // ── Auth / room ─────────────────────────────────────────────────────────────
  const [token,              setToken]              = useState('');
  const [currentUser,        setCurrentUser]        = useState<any>(null);
  const [challengeName,      setChallengeName]      = useState('');
  const [inviteCode,         setInviteCode]         = useState('');
  const [copied,             setCopied]             = useState(false);
  const [challengeCreatorId, setChallengeCreatorId] = useState<number | null>(null);

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
  const [gymLat,           setGymLat]           = useState<number | null>(null);
  const [gymLng,           setGymLng]           = useState<number | null>(null);
  const [gymRadius,        setGymRadius]        = useState(200);
  const [attendedToday,    setAttendedToday]    = useState(false);
  const [attendanceStreak, setAttendanceStreak] = useState(0);
  const [distanceFromGym,  setDistanceFromGym]  = useState<number | null>(null);
  const [inRange,          setInRange]          = useState(false);
  const [secondsInRange,   setSecondsInRange]   = useState(0);
  const [checkingIn,       setCheckingIn]       = useState(false);
  const [userLat,          setUserLat]          = useState<number | null>(null);
  const [userLng,          setUserLng]          = useState<number | null>(null);
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

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

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
      if (uRaw) { try { parsedUser = JSON.parse(uRaw); setCurrentUser(parsedUser); } catch {} }
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
      setInviteCode(data.challenge?.invite_code ?? '');
      setChallengeCreatorId(data.challenge?.user_id ?? null);
      setUseLocation(data.challenge?.use_location ?? false);
      setUseCamera(data.challenge?.use_camera ?? false);
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
      setAttendedToday(res.data.attended_today ?? false);
      setPendingToday(res.data.pending_today ?? false);
      setAttendanceStreak(res.data.streak ?? 0);
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

  const handleConfirmAttendance = async (attendanceId: number) => {
    const t = token;
    if (!t) return;
    setConfirmingId(attendanceId);
    try {
      await attendanceApi.confirmAttendance(attendanceId, t);
      setPendingAttendances(prev => prev.filter(a => a.id !== attendanceId));
    } catch {}
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

  // ── Location watching ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!useLocation || !gymLat || !gymLng) return;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20 },
        loc => {
          const dist = haversineDistance(loc.coords.latitude, loc.coords.longitude, gymLat, gymLng);
          setUserLat(loc.coords.latitude);
          setUserLng(loc.coords.longitude);
          setDistanceFromGym(Math.round(dist));
          setInRange(dist <= gymRadius);
        }
      );
      locationSubRef.current = sub;
    })();

    return () => {
      sub?.remove();
      locationSubRef.current = null;
    };
  }, [useLocation, gymLat, gymLng, gymRadius]);

  // ── 5-minute in-range timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!inRange || attendedToday) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (!inRange) setSecondsInRange(0);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsInRange(prev => {
        if (prev >= REQUIRED_SECONDS - 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return REQUIRED_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [inRange, attendedToday]);

  const handleCheckIn = async () => {
    if (!userLat || !userLng || !id) return;
    setCheckingIn(true);
    try {
      const res = await attendanceApi.attend(id, userLat, userLng, token);
      setAttendedToday(true);
      setAttendanceStreak(res.data.streak ?? 0);
      Alert.alert('¡Asistencia!', `🔥 Racha: ${res.data.streak} día${res.data.streak !== 1 ? 's' : ''} consecutivo${res.data.streak !== 1 ? 's' : ''}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo registrar la asistencia.');
    } finally { setCheckingIn(false); }
  };

  const handleCameraAttendance = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.'); return;
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
        Alert.alert('¡Foto enviada!', 'Esperando que un compañero confirme que estás en el gym.');
      } else {
        setAttendedToday(true);
        setAttendanceStreak(res.data.streak ?? 0);
        Alert.alert('¡Asistencia!', `🔥 Racha: ${res.data.streak} día${res.data.streak !== 1 ? 's' : ''}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo registrar la asistencia.');
    } finally { setCheckingIn(false); }
  };

  const handleSetGymLocation = async () => {
    setShowMenu(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu ubicación.'); return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await attendanceApi.setGymLocation(id, loc.coords.latitude, loc.coords.longitude, token);
      setGymLat(loc.coords.latitude);
      setGymLng(loc.coords.longitude);
      Alert.alert('¡Listo!', 'Ubicación del gym guardada desde tu posición actual.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la ubicación del gym.');
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
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo enviar el mensaje.');
      setMsgText(content);
    }
    setSendingMsg(false);
  };

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  const pickFromGallery = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.'); return;
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
      Alert.alert('Error', 'No se pudo guardar la imagen. Intenta de nuevo.');
    } finally { setSavingJourney(false); }
  };

  const deleteJourneyEntry = (entryId: number) => {
    Alert.alert('Eliminar foto', '¿Eliminar esta foto del journey?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await journeyApi.delete(entryId, token);
          setJourney(prev => prev.filter(e => e.id !== entryId));
        } catch {
          Alert.alert('Error', 'No se pudo eliminar la foto.');
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

  const handleEdit = () => { setShowMenu(false); setEditName(challengeName); setShowEditModal(true); };
  const handleSaveEdit = async () => {
    if (!editName.trim() || !token) return;
    setSavingEdit(true);
    try {
      const res = await challengeApi.update(id, { name: editName.trim() }, token);
      setChallengeName(res.data.challenge?.name ?? editName.trim());
      setShowEditModal(false);
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo actualizar.'); }
    setSavingEdit(false);
  };
  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert('Eliminar sala', '¿Estás seguro? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await challengeApi.delete(id, token); router.back(); }
        catch (e: any) { Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo eliminar.'); }
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
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  const isCreator = currentUser && challengeCreatorId && Number(currentUser.id) === challengeCreatorId;
  const isOwnCard = selectedMember && String(selectedMember.id) === String(currentUser?.id);
  const topPts    = leaderboard.length > 0 ? Math.max(...leaderboard.map(p => p.points), 1) : 1;
  const memberPct = selectedMember ? Math.min(100, Math.round((selectedMember.points / topPts) * 100)) : 0;
  const scrollPad = 40 + Math.max(insets.bottom, 8);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTransY.value }],
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG_DARK }} edges={['bottom']}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPad }}
        style={{ flex: 1, backgroundColor: BG_DARK }}
      >

        {/* ══════════════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════════════ */}
        <View style={{ height: 260, position: 'relative' }}>
          <Image source={{ uri: HERO_IMAGE }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient
            colors={['rgba(7,7,15,0.3)', 'rgba(7,7,15,0.97)']}
            locations={[0, 0.68]}
            style={[StyleSheet.absoluteFillObject, {
              justifyContent: 'space-between', padding: HM, paddingBottom: 22,
            }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 8 }}>
              <Pressable onPress={() => router.back()} style={st.iconBtn}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={handleCopyCode} style={st.codePill}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={11} color={ACCENT} />
                  <Text style={st.codePillTxt}>{copied ? '¡COPIADO!' : inviteCode || '...'}</Text>
                </Pressable>
                <Pressable onPress={openMessages} style={[st.iconBtn, { backgroundColor: 'rgba(255,0,102,0.18)' }]}>
                  <MaterialCommunityIcons name="message-text-outline" size={18} color={ACCENT} />
                </Pressable>
                {isCreator && (
                  <Pressable onPress={() => setShowMenu(true)} style={st.iconBtn}>
                    <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
                  </Pressable>
                )}
              </View>
            </View>

            <View>
              <View style={st.heroBadge}>
                <Text style={st.heroBadgeTxt}>SALA #{id}</Text>
              </View>
              <Text style={[st.heroTitle, bf('900')]}>{challengeName || `SALA #${id}`}</Text>
              <Text style={st.heroSub}>{leaderboard.length} participante{leaderboard.length !== 1 ? 's' : ''}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            MEMBER TABS — GRANDES Y CENTRADOS
        ══════════════════════════════════════════════════════════════════ */}
        <View style={st.tabsSection}>
          <Text style={[st.sectionLabel, { textAlign: 'center', marginBottom: 16 }]}>MIEMBROS</Text>

          {loadingLB ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
          ) : leaderboard.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <Ionicons name="people-outline" size={32} color={TEXT_MUTED} />
              <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Sé el primero en unirte</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                st.tabsRow,
                leaderboard.length <= 4 && { justifyContent: 'center', flexGrow: 1 },
              ]}
            >
              {leaderboard.map(member => {
                const isSelected = selectedMember?.id === member.id;
                const avatarUrl  = member.avatar_url ? getStorageUrl(member.avatar_url) : null;
                const isMe       = String(member.id) === String(currentUser?.id);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => { setSelectedMember(member); setCompareMode(false); setCompareTarget(null); }}
                    style={[st.memberTab, isSelected && st.memberTabActive]}
                  >
                    {/* Glow ring when active */}
                    {isSelected && (
                      <View style={st.tabGlowRing} />
                    )}

                    {/* Rank badge */}
                    {member.rank <= 3 && (
                      <View style={st.tabRankBadge}>
                        <Text style={{ fontSize: 12 }}>
                          {member.rank === 1 ? '🥇' : member.rank === 2 ? '🥈' : '🥉'}
                        </Text>
                      </View>
                    )}

                    <MemberAvatar
                      url={avatarUrl}
                      name={member.username}
                      size={72}
                      borderColor={isSelected ? ACCENT : isMe ? ACCENT + '60' : 'rgba(255,255,255,0.06)'}
                      borderWidth={isSelected ? 3 : 1.5}
                    />

                    <Text style={[st.tabName, isSelected && { color: ACCENT }]} numberOfLines={1}>
                      {member.username.split(' ')[0]}
                      {isMe ? ' (tú)' : ''}
                    </Text>
                    <Text style={[st.tabPts, isSelected && { color: ACCENT + 'CC' }]}>
                      {member.points} pts
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <Animated.View style={[{ paddingHorizontal: HM }, contentStyle]}>

          {/* ── SELECTED MEMBER CARD ──────────────────────────────────────── */}
          {selectedMember && (
            <Animated.View entering={FadeInDown.duration(280)} style={[st.card, { overflow: 'hidden', marginBottom: 16 }]}>
              <LinearGradient
                colors={[ACCENT + '22', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <MemberAvatar
                  url={selectedMember.avatar_url ? getStorageUrl(selectedMember.avatar_url) : null}
                  name={selectedMember.username}
                  size={74}
                  borderColor={ACCENT}
                  borderWidth={2.5}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={[st.memberName, bf('700')]} numberOfLines={1}>{selectedMember.username}</Text>
                    {isOwnCard && <View style={st.youBadge}><Text style={st.youBadgeTxt}>TÚ</Text></View>}
                  </View>
                  <View style={[st.rankBadge, selectedMember.rank === 1 && { borderColor: ACCENT + '60', backgroundColor: ACCENT + '10' }]}>
                    <Text style={[st.rankBadgeTxt, selectedMember.rank === 1 && { color: ACCENT }]}>
                      #{selectedMember.rank} RANKING
                    </Text>
                  </View>
                  {isOwnCard && bioText.length > 0 && (
                    <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 6 }} numberOfLines={2}>{bioText}</Text>
                  )}
                </View>
                {isOwnCard ? (
                  <Pressable onPress={() => setShowBioModal(true)} style={st.iconBtnSm}>
                    <Ionicons name="pencil-outline" size={14} color={TEXT_SUB} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => { setCompareTarget(selectedMember); setCompareMode(true); }}
                    style={[st.iconBtnSm, compareMode && { backgroundColor: ACCENT + '20', borderColor: ACCENT + '50' }]}
                  >
                    <Ionicons name="git-compare-outline" size={14} color={compareMode ? ACCENT : TEXT_SUB} />
                  </Pressable>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <StatPill icon="trophy-outline"  value={selectedMember.points}    label="PTS"      accent />
                <StatPill icon="barbell-outline" value={selectedMember.sessions}  label="SESIONES"        />
                <StatPill icon="repeat-outline"  value={selectedMember.total_reps}label="REPS"            />
              </View>

              <ProgressBar pct={memberPct} label="Progreso en el desafío" />

              {isOwnCard && goalText.length > 0 && (
                <View style={st.goalChip}>
                  <Ionicons name="flag-outline" size={12} color={ACCENT} />
                  <Text style={{ color: TEXT_SUB, fontSize: 11, flex: 1 }}>{goalText}</Text>
                </View>
              )}

              {!isOwnCard && (
                <Pressable
                  onPress={() => setShowProfileModal(true)}
                  style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER }}
                >
                  <Ionicons name="person-outline" size={14} color={TEXT_SUB} />
                  <Text style={{ color: TEXT_SUB, fontSize: 12, fontWeight: '700' }}>Ver perfil</Text>
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* ── COMPARE MODE ────────────────────────────────────────────── */}
          {compareMode && compareTarget && (() => {
            const me = leaderboard.find(p => String(p.id) === String(currentUser?.id));
            if (!me) return null;
            return (
              <Animated.View entering={FadeInDown.duration(300)} style={[st.card, { marginBottom: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Ionicons name="git-compare-outline" size={15} color={ACCENT} />
                  <Text style={[st.sectionLabel, { marginBottom: 0 }]}>COMPARATIVA</Text>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => { setCompareMode(false); setCompareTarget(null); }}>
                    <Ionicons name="close-circle" size={20} color={TEXT_MUTED} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 18 }}>
                  <View style={{ alignItems: 'center', gap: 5 }}>
                    <MemberAvatar url={me.avatar_url ? getStorageUrl(me.avatar_url) : null} name={me.username} size={56} borderColor={ACCENT} borderWidth={2} />
                    <Text style={{ color: TEXT_LIGHT, fontSize: 11, fontWeight: '700' }}>{me.username.split(' ')[0]}</Text>
                    <View style={st.youBadge}><Text style={st.youBadgeTxt}>TÚ</Text></View>
                  </View>
                  <View style={st.vsCircle}><Text style={{ color: ACCENT, fontWeight: '900', fontSize: 16 }}>VS</Text></View>
                  <View style={{ alignItems: 'center', gap: 5 }}>
                    <MemberAvatar url={compareTarget.avatar_url ? getStorageUrl(compareTarget.avatar_url) : null} name={compareTarget.username} size={56} borderColor={CARD_BORDER} borderWidth={2} />
                    <Text style={{ color: TEXT_LIGHT, fontSize: 11, fontWeight: '700' }}>{compareTarget.username.split(' ')[0]}</Text>
                    <View style={st.rankBadge}><Text style={st.rankBadgeTxt}>#{compareTarget.rank}</Text></View>
                  </View>
                </View>
                <CompareRow label="Puntos"   a={me.points}     b={compareTarget.points}     aName={me.username} bName={compareTarget.username} />
                <CompareRow label="Sesiones" a={me.sessions}   b={compareTarget.sessions}   aName={me.username} bName={compareTarget.username} />
                <CompareRow label="Reps"     a={me.total_reps} b={compareTarget.total_reps} aName={me.username} bName={compareTarget.username} />
              </Animated.View>
            );
          })()}

          {/* ── PERIOD FILTER ────────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['semana', 'mes', 'año'] as const).map(p => (
              <Pressable
                key={p}
                onPress={() => { setSelectedPeriod(p); fetchLeaderboard(token, p); }}
                style={[st.filterBtn, selectedPeriod === p && { backgroundColor: ACCENT }]}
              >
                <Text style={[st.filterTxt, selectedPeriod === p && { color: '#fff' }]}>
                  {p === 'semana' ? 'SEMANA' : p === 'mes' ? 'MES' : 'AÑO'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── LEADERBOARD ──────────────────────────────────────────────── */}
          <Text style={[st.sectionLabel, { marginBottom: 12 }]}>CLASIFICACIÓN</Text>
          {loadingLB ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />
          ) : leaderboard.length === 0 ? (
            <View style={[st.card, { alignItems: 'center', paddingVertical: 24, gap: 8 }]}>
              <Ionicons name="bar-chart-outline" size={24} color={TEXT_MUTED} />
              <Text style={{ color: TEXT_MUTED, fontSize: 12, fontStyle: 'italic' }}>No hay datos para este período</Text>
            </View>
          ) : (
            leaderboard.map(p => {
              const isMe      = String(p.id) === String(currentUser?.id);
              const avatarUrl = p.avatar_url ? getStorageUrl(p.avatar_url) : null;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => { setSelectedMember(p); setCompareMode(false); setCompareTarget(null); }}
                  style={[
                    st.participantCard,
                    isMe && { borderColor: ACCENT + '50', backgroundColor: ACCENT + '08' },
                    p.rank === 1 && { borderColor: '#FFD700' + '35' },
                  ]}
                >
                  <View style={[st.rankNumBox, p.rank === 1 && { backgroundColor: ACCENT + '20' }]}>
                    {p.rank <= 3
                      ? <Text style={{ fontSize: 14 }}>{p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}</Text>
                      : <Text style={st.rankNum}>#{p.rank}</Text>
                    }
                  </View>
                  <MemberAvatar url={avatarUrl} name={p.username} size={36} borderColor={isMe ? ACCENT : 'transparent'} borderWidth={isMe ? 1.5 : 0} />
                  <Text style={[st.participantName, bf('700'), isMe && { color: ACCENT }]} numberOfLines={1}>
                    {p.username}{isMe ? ' (Tú)' : ''}
                  </Text>
                  <View style={st.pStats}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={st.pStatVal}>{p.points}</Text>
                      <Text style={st.pStatLbl}>PTS</Text>
                    </View>
                    <View style={st.pDivider} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={st.pStatVal}>{p.sessions}</Text>
                      <Text style={st.pStatLbl}>SES</Text>
                    </View>
                    <View style={st.pDivider} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={st.pStatVal}>{p.total_reps}</Text>
                      <Text style={st.pStatLbl}>REPS</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* ══════════════════════════════════════════════════════════════
              ASISTENCIA AL GYM — check-in por ubicación
          ══════════════════════════════════════════════════════════════ */}
          {isOwnCard && useLocation && (
            <Animated.View entering={FadeInDown.duration(280)} style={[st.card, { marginTop: 16, marginBottom: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ionicons name="location" size={14} color={ACCENT} />
                <Text style={st.sectionLabel}>ASISTENCIA AL GYM</Text>
              </View>

              {!gymLat ? (
                <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                  <Ionicons name="location-outline" size={28} color={TEXT_MUTED} />
                  <Text style={{ color: TEXT_MUTED, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                    {isCreator
                      ? 'Toca ··· y elige "Establecer ubicación gym" para activar el check-in.'
                      : 'El creador aún no configuró la ubicación del gym.'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Mini mapa siempre visible cuando hay gym location */}
                  <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                    <MapView
                      key={`${gymLat}-${gymLng}`}
                      style={{ width: '100%', height: 190 }}
                      initialRegion={{
                        latitude: gymLat!,
                        longitude: gymLng!,
                        latitudeDelta: 0.004,
                        longitudeDelta: 0.004,
                      }}
                      showsUserLocation
                      showsMyLocationButton={false}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      provider="google"
                      customMapStyle={DARK_MAP_STYLE}
                    >
                      <Circle
                        center={{ latitude: gymLat!, longitude: gymLng! }}
                        radius={gymRadius}
                        fillColor="rgba(255,0,102,0.12)"
                        strokeColor={ACCENT}
                        strokeWidth={2}
                      />
                      <Marker
                        coordinate={{ latitude: gymLat!, longitude: gymLng! }}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View style={{ alignItems: 'center' }}>
                          <View style={{
                            backgroundColor: ACCENT, borderRadius: 22, width: 36, height: 36,
                            alignItems: 'center', justifyContent: 'center',
                            borderWidth: 2.5, borderColor: '#fff',
                            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
                          }}>
                            <Ionicons name="fitness-outline" size={18} color="#fff" />
                          </View>
                          <View style={{ width: 2, height: 8, backgroundColor: ACCENT }} />
                        </View>
                      </Marker>
                    </MapView>
                    {/* Badge de estado encima del mapa */}
                    <View style={{
                      position: 'absolute', top: 10, left: 10,
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      backgroundColor: 'rgba(7,7,15,0.85)', borderRadius: 20,
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderWidth: 1, borderColor: inRange ? '#22C55E40' : CARD_BORDER,
                    }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: inRange ? '#22C55E' : TEXT_MUTED }} />
                      <Text style={{ color: inRange ? '#22C55E' : TEXT_MUTED, fontSize: 10, fontWeight: '800' }}>
                        {distanceFromGym === null ? 'GPS...' : inRange ? `EN RANGO · ${distanceFromGym}m` : `${distanceFromGym}m del gym`}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {gymLat && attendedToday ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#22C55E18', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                  </View>
                  <View>
                    <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 14 }}>¡Asistencia registrada hoy!</Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>
                      🔥 Racha: {attendanceStreak} día{attendanceStreak !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  {/* Status indicator */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: inRange ? '#22C55E' : TEXT_MUTED }} />
                    <Text style={{ color: inRange ? '#22C55E' : TEXT_MUTED, fontSize: 12, fontWeight: '700', flex: 1 }}>
                      {distanceFromGym === null
                        ? 'Obteniendo ubicación...'
                        : inRange
                          ? `EN RANGO · ${distanceFromGym}m del gym`
                          : `LEJOS DEL GYM · ${distanceFromGym}m`}
                    </Text>
                    {!inRange && distanceFromGym !== null && (
                      <Text style={{ color: TEXT_MUTED, fontSize: 10 }}>Radio: {gymRadius}m</Text>
                    )}
                  </View>

                  {/* Progress bar - only when in range and timer running */}
                  {inRange && secondsInRange < REQUIRED_SECONDS && (
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>TIEMPO EN RANGO</Text>
                        <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '800' }}>
                          {(() => { const r = REQUIRED_SECONDS - secondsInRange; return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')} restantes`; })()}
                        </Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: CARD_BORDER, borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ width: `${(secondsInRange / REQUIRED_SECONDS) * 100}%`, height: 6, backgroundColor: '#22C55E', borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 6, textAlign: 'center' }}>
                        Quédate 5 min en el gym para registrar tu asistencia
                      </Text>
                    </View>
                  )}

                  {/* Check-in button — appears after 5 min */}
                  {secondsInRange >= REQUIRED_SECONDS && (
                    <Pressable
                      style={[{
                        height: 50, borderRadius: 14, flexDirection: 'row', gap: 8,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#22C55E',
                      }, checkingIn && { opacity: 0.6 }]}
                      onPress={handleCheckIn}
                      disabled={checkingIn}
                    >
                      {checkingIn
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>REGISTRAR ASISTENCIA</Text>
                          </>
                      }
                    </Pressable>
                  )}

                  {/* Streak preview */}
                  {attendanceStreak > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      <Text style={{ fontSize: 16 }}>🔥</Text>
                      <Text style={{ color: TEXT_LIGHT, fontWeight: '700', fontSize: 12 }}>
                        Racha actual: {attendanceStreak} día{attendanceStreak !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Animated.View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ASISTENCIA POR FOTO
          ══════════════════════════════════════════════════════════════ */}
          {isOwnCard && useCamera && (
            <Animated.View entering={FadeInDown.duration(280)} style={[st.card, { marginTop: 16, marginBottom: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ionicons name="camera" size={14} color={ACCENT} />
                <Text style={st.sectionLabel}>ASISTENCIA POR FOTO</Text>
              </View>

              {attendedToday ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#22C55E20', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                  </View>
                  <View>
                    <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 14 }}>¡Asistencia registrada hoy!</Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>🔥 Racha: {attendanceStreak} día{attendanceStreak !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              ) : pendingToday ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 14 }}>Foto pendiente de confirmación</Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 3 }}>Un compañero de sala necesita confirmar tu foto</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 14 }}>
                    Toma una selfie en el gym. Un compañero de sala confirmará que estás ahí.
                  </Text>

                  {showCameraPreview && cameraPhotoUri && (
                    <View style={{ marginBottom: 14 }}>
                      <Image source={{ uri: cameraPhotoUri }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <Pressable
                          onPress={() => { setShowCameraPreview(false); setCameraPhotoUri(null); }}
                          style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ color: TEXT_MUTED, fontWeight: '700', fontSize: 13 }}>Repetir</Text>
                        </Pressable>
                        <Pressable
                          onPress={confirmCameraAttendance}
                          disabled={checkingIn}
                          style={[{ flex: 1, height: 44, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }, checkingIn && { opacity: 0.6 }]}
                        >
                          {checkingIn
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>ENVIAR FOTO</Text>
                          }
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {!showCameraPreview && (
                    <Pressable
                      onPress={handleCameraAttendance}
                      style={{ height: 50, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT }}
                    >
                      <Ionicons name="camera-outline" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>TOMAR FOTO</Text>
                    </Pressable>
                  )}

                  {attendanceStreak > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      <Text style={{ fontSize: 16 }}>🔥</Text>
                      <Text style={{ color: TEXT_LIGHT, fontWeight: '700', fontSize: 12 }}>Racha actual: {attendanceStreak} día{attendanceStreak !== 1 ? 's' : ''}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Fotos de compañeros pendientes de confirmación */}
              {pendingAttendances.length > 0 && (
                <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: CARD_BORDER, paddingTop: 16 }}>
                  <Text style={{ color: TEXT_MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>
                    CONFIRMAR ASISTENCIA DE COMPAÑEROS
                  </Text>
                  {pendingAttendances.map((pa: any) => (
                    <View key={pa.id} style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                            {(pa.user_name?.[0] ?? '?').toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={{ color: TEXT_LIGHT, fontWeight: '700', fontSize: 13 }}>{pa.user_name}</Text>
                          <Text style={{ color: TEXT_MUTED, fontSize: 11 }}>Solicita confirmación de asistencia</Text>
                        </View>
                      </View>
                      {pa.photo_url && (
                        <Image
                          source={{ uri: pa.photo_url }}
                          style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 10 }}
                          resizeMode="cover"
                        />
                      )}
                      <Pressable
                        onPress={() => handleConfirmAttendance(pa.id)}
                        disabled={confirmingId === pa.id}
                        style={[{ height: 44, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }, confirmingId === pa.id && { opacity: 0.6 }]}
                      >
                        {confirmingId === pa.id
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✓ CONFIRMAR QUE ESTÁ EN EL GYM</Text>
                        }
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              JOURNEY — solo si es tu propio card
          ══════════════════════════════════════════════════════════════ */}
          {isOwnCard && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
                <View>
                  <Text style={st.sectionLabel}>MI JOURNEY</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 11 }}>Fotos de tu progreso en la sala</Text>
                </View>
                <Pressable onPress={openJourneyModal} style={st.addJourneyBtn}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>AÑADIR</Text>
                </Pressable>
              </View>

              {journey.length === 0 ? (
                <Pressable onPress={openJourneyModal} style={st.journeyEmpty}>
                  <LinearGradient
                    colors={[ACCENT + '10', '#6B35FF10']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={st.journeyEmptyIcon}>
                    <MaterialCommunityIcons name="image-plus" size={36} color={ACCENT} />
                  </View>
                  <Text style={{ color: TEXT_LIGHT, fontSize: 15, fontWeight: '700', marginTop: 12 }}>Empieza tu journey</Text>
                  <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    Añade fotos para documentar tu progreso en este desafío
                  </Text>
                  <View style={[st.addJourneyBtn, { marginTop: 14 }]}>
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>PRIMERA FOTO</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={st.journeyGrid}>
                  {journey.map((entry, idx) => (
                    <Pressable
                      key={entry.id}
                      style={[st.journeyCard, idx % 2 === 0 && { marginRight: 8 }]}
                      onLongPress={() => deleteJourneyEntry(entry.id)}
                    >
                      <Image
                        source={{ uri: entry.imageUri }}
                        style={st.journeyImg}
                        contentFit="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(7,7,15,0.9)']}
                        style={st.journeyOverlay}
                      />
                      {/* Date chip */}
                      <View style={st.journeyDateChip}>
                        <Ionicons name="calendar-outline" size={9} color={ACCENT} />
                        <Text style={st.journeyDateTxt}>{formatJourneyDate(entry.date)}</Text>
                      </View>
                      {entry.note.length > 0 && (
                        <Text style={st.journeyNote} numberOfLines={2}>{entry.note}</Text>
                      )}
                      {/* If first, show "INICIO" badge; if latest, show "HOY" */}
                      {idx === journey.length - 1 && (
                        <View style={st.journeyBadge}>
                          <Text style={st.journeyBadgeTxt}>INICIO</Text>
                        </View>
                      )}
                      {idx === 0 && journey.length > 1 && (
                        <View style={[st.journeyBadge, { backgroundColor: ACCENT }]}>
                          <Text style={st.journeyBadgeTxt}>AHORA</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {journey.length > 0 && (
                <Text style={{ color: TEXT_MUTED, fontSize: 10, textAlign: 'center', marginTop: 4, marginBottom: 4 }}>
                  Mantén presionado para eliminar · {journey.length} foto{journey.length !== 1 ? 's' : ''}
                </Text>
              )}
            </>
          )}

        </Animated.View>
      </ScrollView>

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
                    <View style={[st.rankBadge, { marginTop: 6 }]}>
                      <Text style={st.rankBadgeTxt}>#{selectedMember.rank} EN SALA</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'PUNTOS',   value: selectedMember.points },
                      { label: 'SESIONES', value: selectedMember.sessions },
                      { label: 'REPS',     value: selectedMember.total_reps },
                      { label: 'DÍAS GYM', value: selectedMember.attendance_count },
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
                    <Text style={{ color: TEXT_SUB, fontWeight: '700' }}>Cerrar</Text>
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
            <Text style={[st.sheetTitle, bf('700')]}>AÑADIR AL JOURNEY</Text>

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
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 6 }}>CÁMARA</Text>
                      </>
                  }
                </Pressable>
                <Pressable style={[st.pickerBtn, { backgroundColor: CARD_BG2 }]} onPress={pickFromGallery} disabled={pickingImage}>
                  {pickingImage
                    ? <ActivityIndicator color={ACCENT} />
                    : <>
                        <Ionicons name="images-outline" size={24} color={ACCENT} />
                        <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', marginTop: 6 }}>GALERÍA</Text>
                      </>
                  }
                </Pressable>
              </View>
            )}

            {/* Date picker */}
            <Text style={[st.inputLabel, { marginBottom: 12, textAlign: 'center' }]}>FECHA DEL LOGRO</Text>
            <View style={st.datePickerRow}>
              <DateWheel label="DÍA"   value={journeyDay}   min={1} max={31} onChange={setJourneyDay} />
              <View style={{ width: 1, backgroundColor: CARD_BORDER, marginVertical: 8 }} />
              <DateWheel label="MES"   value={journeyMonth} min={1} max={12} onChange={setJourneyMonth}
                format={v => MONTHS[v - 1]} />
              <View style={{ width: 1, backgroundColor: CARD_BORDER, marginVertical: 8 }} />
              <DateWheel label="AÑO"   value={journeyYear}  min={2020} max={new Date().getFullYear()} onChange={setJourneyYear}
                format={v => String(v)} />
            </View>

            {/* Note */}
            <Text style={[st.inputLabel, { marginTop: 14, marginBottom: 6 }]}>NOTA (opcional)</Text>
            <TextInput
              style={[st.input, { marginBottom: 18, textAlign: 'left', paddingHorizontal: 14 }]}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="¿Cómo fue este logro?..."
              placeholderTextColor={TEXT_MUTED}
              maxLength={120}
            />

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[st.sheetBtn, { backgroundColor: CARD_BG2 }]} onPress={() => setShowJourneyModal(false)}>
                <Text style={st.sheetBtnTxt}>CANCELAR</Text>
              </Pressable>
              <Pressable
                style={[st.sheetBtn, { backgroundColor: ACCENT }, (!newImgUri || savingJourney) && { opacity: 0.4 }]}
                onPress={saveJourneyEntry}
                disabled={!newImgUri || savingJourney}
              >
                {savingJourney
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={st.sheetBtnTxt}>GUARDAR</Text>
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
              <Text style={st.menuOptionTxt}>Editar sala</Text>
            </Pressable>
            {useLocation && (
              <>
                <View style={{ height: 1, backgroundColor: CARD_BORDER }} />
                <Pressable style={st.menuOption} onPress={handleSetGymLocation}>
                  <Ionicons name="location-outline" size={18} color={TEXT_LIGHT} />
                  <Text style={st.menuOptionTxt}>{gymLat ? 'Actualizar ubicación gym' : 'Establecer ubicación gym'}</Text>
                </Pressable>
              </>
            )}
            <View style={{ height: 1, backgroundColor: CARD_BORDER }} />
            <Pressable style={st.menuOption} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={ACCENT} />
              <Text style={[st.menuOptionTxt, { color: ACCENT }]}>Eliminar sala</Text>
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
              <Text style={[st.sheetTitle, bf('700')]}>MENSAJES — {challengeName}</Text>
              <Pressable onPress={() => setShowMsgModal(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={TEXT_MUTED} />
              </Pressable>
            </View>

            {loadingMsgs ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            ) : roomMsgs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <MaterialCommunityIcons name="message-outline" size={36} color={TEXT_MUTED} />
                <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Sin mensajes aún. ¡Sé el primero!</Text>
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
                placeholder="Escribe un mensaje..."
                placeholderTextColor={TEXT_MUTED}
                multiline
                maxLength={500}
                returnKeyType="send"
                submitBehavior="newline"
              />
              <Pressable
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
          EDIT ROOM MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <Pressable style={st.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={st.modalBox} onPress={() => {}}>
            <Text style={[st.modalTitle, bf('700')]}>EDITAR SALA</Text>
            <TextInput
              style={st.modalInput} value={editName} onChangeText={setEditName}
              placeholder="Nombre de la sala" placeholderTextColor={TEXT_MUTED} autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[st.modalBtn, { backgroundColor: CARD_BG2 }]} onPress={() => setShowEditModal(false)}>
                <Text style={st.modalBtnTxt}>CANCELAR</Text>
              </Pressable>
              <Pressable
                style={[st.modalBtn, { backgroundColor: ACCENT }, !editName.trim() && { opacity: 0.4 }]}
                onPress={handleSaveEdit} disabled={!editName.trim() || savingEdit}
              >
                {savingEdit ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.modalBtnTxt}>GUARDAR</Text>}
              </Pressable>
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
            <Text style={[st.sheetTitle, bf('700')]}>MI PERFIL EN LA SALA</Text>
            <Text style={[st.inputLabel, { marginBottom: 6 }]}>BIO</Text>
            <TextInput
              style={[st.input, { height: 72, textAlignVertical: 'top', paddingTop: 10, textAlign: 'left', paddingHorizontal: 14, marginBottom: 14 }]}
              value={bioText} onChangeText={setBioText}
              placeholder="Cuéntale algo a tu sala..." placeholderTextColor={TEXT_MUTED}
              multiline autoFocus maxLength={150}
            />
            <Text style={[st.inputLabel, { marginBottom: 6 }]}>MI META EN EL DESAFÍO</Text>
            <TextInput
              style={[st.input, { textAlign: 'left', paddingHorizontal: 14, marginBottom: 18 }]}
              value={goalText} onChangeText={setGoalText}
              placeholder="Ej. Correr 5km sin parar..." placeholderTextColor={TEXT_MUTED}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[st.sheetBtn, { backgroundColor: CARD_BG2 }]} onPress={() => setShowBioModal(false)}>
                <Text style={st.sheetBtnTxt}>CANCELAR</Text>
              </Pressable>
              <Pressable style={[st.sheetBtn, { backgroundColor: ACCENT }]} onPress={() => setShowBioModal(false)}>
                <Text style={st.sheetBtnTxt}>GUARDAR</Text>
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
  codePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(15,15,26,0.85)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: ACCENT,
  },
  codePillTxt: { fontSize: 10, color: ACCENT, fontWeight: '700', letterSpacing: 0.8 },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: ACCENT,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6,
  },
  heroBadgeTxt: { fontSize: 10, color: ACCENT, fontWeight: '700', letterSpacing: 1 },
  heroTitle:    { fontSize: 34, color: '#fff', letterSpacing: 1.5, lineHeight: 38 },
  heroSub:      { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 3 },

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
    borderColor: ACCENT + '55',
    backgroundColor: ACCENT + '08',
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
    color: TEXT_LIGHT, fontSize: 12, fontWeight: '700',
    textAlign: 'center', letterSpacing: 0.2,
  },
  tabPts: {
    color: TEXT_MUTED, fontSize: 11, fontWeight: '600',
  },

  // ── Section label ────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10, color: TEXT_SUB, letterSpacing: 1.5,
    textTransform: 'uppercase', fontWeight: '800',
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG, borderRadius: 18,
    borderWidth: 1, borderColor: CARD_BORDER, padding: 16,
  },

  // ── Member profile card ───────────────────────────────────────────────────────
  memberName: { fontSize: 20, color: TEXT_LIGHT, letterSpacing: 0.3 },
  youBadge:   { backgroundColor: ACCENT + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  youBadgeTxt:{ color: ACCENT, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  rankBadge:  {
    alignSelf: 'flex-start', backgroundColor: CARD_BG2, borderRadius: 8,
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
  statPillVal: { color: TEXT_LIGHT, fontSize: 14, fontWeight: '800' },
  statPillLbl: { color: TEXT_MUTED, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Progress ─────────────────────────────────────────────────────────────────
  progLabel: { color: TEXT_SUB, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
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
    flex: 1, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
  },
  filterTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: TEXT_MUTED },

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
  rankNum: { color: TEXT_MUTED, fontSize: 11, fontWeight: '700' },
  participantName: { fontSize: 13, color: TEXT_LIGHT, letterSpacing: 0.3, flex: 1 },
  pStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pStatVal: { fontSize: 12, color: TEXT_LIGHT, fontWeight: '700', textAlign: 'center' },
  pStatLbl: { fontSize: 8, color: TEXT_MUTED, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' },
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
  journeyDateTxt: { color: TEXT_LIGHT, fontSize: 9, fontWeight: '700' },
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
  journeyBadgeTxt: { color: TEXT_LIGHT, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  // ── Progress form ─────────────────────────────────────────────────────────────
  inputLabel: { fontSize: 9, color: TEXT_SUB, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  input: {
    backgroundColor: BG_DARK, borderRadius: 12, height: 46,
    paddingHorizontal: 12, fontSize: 16, color: TEXT_LIGHT,
    fontWeight: '700', textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: ACCENT,
  },
  registerBtn:    { height: 50, backgroundColor: ACCENT, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  registerBtnTxt: { fontSize: 12, color: '#fff', fontWeight: '800', letterSpacing: 1.5 },

  // ── Recent row ────────────────────────────────────────────────────────────────
  recentRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  recentIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: ACCENT + '18', alignItems: 'center', justifyContent: 'center',
  },
  datePill: {
    backgroundColor: CARD_BG2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },

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
  sheetTitle: { fontSize: 18, color: ACCENT, letterSpacing: 1.2, marginBottom: 18 },
  sheetBtn:   { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetBtnTxt:{ fontSize: 12, color: '#fff', fontWeight: '800', letterSpacing: 1 },

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
    color: TEXT_LIGHT, fontSize: 20, fontWeight: '800',
    textAlign: 'center', marginVertical: 8, letterSpacing: 0.5,
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
  modalTitle: { fontSize: 16, color: ACCENT, letterSpacing: 1.2, marginBottom: 16 },
  modalInput: {
    backgroundColor: BG_DARK, borderRadius: 12, height: 48, paddingHorizontal: 14,
    fontSize: 15, color: TEXT_LIGHT, fontWeight: '600',
    borderBottomWidth: 2, borderBottomColor: ACCENT, marginBottom: 20,
  },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnTxt: { fontSize: 12, color: '#fff', fontWeight: '700', letterSpacing: 1 },
  // ── Messages ──────────────────────────────────────────────────────────────────
  msgRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgBubble:    { backgroundColor: CARD_BG2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  msgBubbleTxt: { color: TEXT_LIGHT, fontSize: 14, lineHeight: 20 },
  msgInputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: CARD_BORDER, paddingTop: 12 },
  msgInput:     { flex: 1, backgroundColor: CARD_BG2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: TEXT_LIGHT, fontSize: 14, maxHeight: 100 },
  msgSendBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
});
