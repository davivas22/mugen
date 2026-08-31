import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wrappedApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';

const { width } = Dimensions.get('window');

const SLIDE_COLORS: [string, string][] = [
  ['#0a0a0a', '#1a0a1a'],  // 0  intro
  ['#0d1b2a', '#1a3a5c'],  // 1  total días
  ['#0a1a2a', '#002244'],  // 2  evolución mensual
  ['#1a0a2e', '#3d1a7a'],  // 3  constancia
  ['#0a1a0a', '#1a4a1a'],  // 4  racha
  ['#2a0a0a', '#6a1a1a'],  // 5  hora
  ['#1a1a0a', '#4a4a00'],  // 6  día favorito
  ['#0a1a2a', '#004a6a'],  // 7  fotos
  ['#001a10', '#004432'],  // 8  confirmaciones
  ['#2a0a1a', '#6a0033'],  // 9  badges
  ['#0a0a0a', '#1a0000'],  // 10 personalidad
  ['#001a30', '#003a60'],  // 11 mi posición
  ['#1a0a00', '#4a2000'],  // 12 mejor mes
  ['#001a2a', '#003a5c'],  // 13 sala total
  ['#0a001a', '#20005a'],  // 14 ranking miembros
  ['#0a2a0a', '#0a5c0a'],  // 15 mensajes
  ['#1a0a0a', '#3a0000'],  // 16 días grupales
  ['#0a0a0a', '#1a0000'],  // 17 final
];

type MemberRank = {
  user_id: number;
  name: string;
  avatar: string | null;
  days: number;
};

type WrappedData = {
  period_months: number;
  sala_name: string;
  personal: {
    total_days: number;
    planned_days: number;
    missed_days: number;
    attendance_pct: number;
    max_streak: number;
    favorite_hour: number | null;
    favorite_day: string | null;
    first_checkin: string | null;
    camera_photos: number;
    journey_photos: number;
    confirmations_received: number;
    badges_earned: number;
    badges_keys: string[];
    monthly_evolution: { month: string; days: number }[];
    best_month: string | null;
    best_month_days: number;
    my_rank: number | null;
    personality: { key: string; icon: string; name: string; desc: string };
  };
  sala: {
    total_days: number;
    member_count: number;
    members_ranking: MemberRank[];
    most_consistent: MemberRank | null;
    least_consistent: MemberRank | null;
    total_badges: number;
    message_count: number;
    most_active_day: string | null;
    most_confirmations: { name: string; count: number } | null;
    group_streak_days: number;
  };
};

const BADGE_MAP: Record<string, { icon: string; name: string }> = {
  primer_dia:    { icon: 'flag-outline',             name: 'Primera Marca' },
  racha_7:       { icon: 'flame-outline',            name: 'Semana de Fuego' },
  racha_30:      { icon: 'barbell-outline',          name: 'Sin Excusas' },
  racha_100:     { icon: 'trophy-outline',           name: 'Leyenda' },
  madrugador:    { icon: 'sunny-outline',            name: 'Madrugador' },
  nocturno:      { icon: 'moon-outline',             name: 'Nocturno' },
  comeback:      { icon: 'refresh-circle-outline',   name: 'Comeback' },
  fin_de_semana: { icon: 'calendar-outline',         name: 'Sin Descanso' },
  fotogenico:    { icon: 'camera-outline',           name: 'Fotogénico' },
  confirmador:   { icon: 'shield-checkmark-outline', name: 'Verificador' },
  fundador:      { icon: 'home-outline',             name: 'Fundador' },
};

function formatHour(h: number | null): string {
  if (h === null) return '?';
  const period = h >= 12 ? 'pm' : 'am';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}${period}`;
}

function formatDate(d: string | null): string {
  if (!d) return '?';
  const date = new Date(d);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ordinal(n: number): string {
  if (n === 1) return '1ro';
  if (n === 2) return '2do';
  if (n === 3) return '3ro';
  return `${n}to`;
}

function MemberAvatar({ member, size = 72, border = false }: { member: MemberRank; size?: number; border?: boolean }) {
  const url = getStorageUrl(member.avatar);
  const style = {
    width: size, height: size, borderRadius: size / 2,
    borderWidth: border ? 3 : 0, borderColor: '#FF0066',
  };
  if (url) {
    return <Image source={{ uri: url }} style={style} contentFit="cover" />;
  }
  return (
    <View style={[style, s.avatarFallback]}>
      <Text style={{ fontSize: size * 0.4, color: '#fff', fontWeight: '700' }}>
        {member.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function WrappedScreen() {
  const { challengeId, months } = useLocalSearchParams<{ challengeId: string; months: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [data, setData]       = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide]     = useState(0);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [countDisplay, setCountDisplay] = useState(0);

  useEffect(() => {
    (async () => {
      const token = await storage.get('token');
      if (!token || !challengeId) return;
      try {
        const res = await wrappedApi.get(challengeId, parseInt(months ?? '12'), token);
        setData(res.data);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.88);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [slide]);

  const animateCount = (target: number) => {
    countAnim.setValue(0);
    setCountDisplay(0);
    const listener = countAnim.addListener(({ value }) => {
      setCountDisplay(Math.round(value));
    });
    Animated.timing(countAnim, {
      toValue: target,
      duration: 1200,
      useNativeDriver: false,
    }).start(() => countAnim.removeListener(listener));
  };

  useEffect(() => {
    if (!data) return;
    const targets: Record<number, number> = {
      1:  data.personal.total_days,
      3:  data.personal.attendance_pct,
      4:  data.personal.max_streak,
      7:  (data.personal.camera_photos) + (data.personal.journey_photos ?? 0),
      8:  data.personal.confirmations_received,
      9:  data.personal.badges_earned,
      11: data.personal.my_rank ?? 0,
      12: data.personal.best_month_days,
      13: data.sala.total_days,
      15: data.sala.message_count,
      16: data.sala.group_streak_days,
    };
    if (targets[slide] !== undefined) animateCount(targets[slide]);
  }, [slide, data]);

  const TOTAL_SLIDES = 18;

  const goNext = () => { if (slide < TOTAL_SLIDES - 1) setSlide(s => s + 1); };
  const goPrev = () => { if (slide > 0) setSlide(s => s - 1); };

  if (loading) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingText}>Preparando tu Wrapped...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingText}>No se pudo cargar. Intenta de nuevo.</Text>
      </View>
    );
  }

  const { personal, sala } = data;

  const maxEvoDays = Math.max(...(personal.monthly_evolution?.map(m => m.days) ?? [1]), 1);

  const slides = [
    // 0 — Intro
    <SlideWrapper key={0} colors={SLIDE_COLORS[0]}>
      <Text style={s.eyebrow}>TU WRAPPED</Text>
      <Text style={s.bigLabel}>{data.sala_name}</Text>
      <View style={s.divider} />
      <Text style={s.subLabel}>Los últimos {data.period_months} meses</Text>
      <Text style={[s.hint, { marginTop: 48 }]}>Toca para continuar →</Text>
    </SlideWrapper>,

    // 1 — Total días
    <SlideWrapper key={1} colors={SLIDE_COLORS[1]}>
      <Text style={s.eyebrow}>ESTE PERÍODO</Text>
      <Text style={s.numberHuge}>{countDisplay}</Text>
      <Text style={s.numberLabel}>días fuiste al gym</Text>
      {personal.first_checkin && (
        <Text style={s.subLabel}>Desde el {formatDate(personal.first_checkin)}</Text>
      )}
    </SlideWrapper>,

    // 2 — Evolución mensual
    <SlideWrapper key={2} colors={SLIDE_COLORS[2]}>
      <Text style={s.eyebrow}>TU EVOLUCIÓN MENSUAL</Text>
      <View style={s.barChart}>
        {(personal.monthly_evolution ?? []).map((m, i) => {
          const barH = maxEvoDays > 0 ? Math.max(4, (m.days / maxEvoDays) * 110) : 4;
          return (
            <View key={i} style={s.barCol}>
              <Text style={s.barValue}>{m.days > 0 ? m.days : ''}</Text>
              <View style={[s.bar, { height: barH, backgroundColor: m.days === maxEvoDays ? '#FF0066' : '#ffffff44' }]} />
              <Text style={s.barMonth}>{m.month}</Text>
            </View>
          );
        })}
      </View>
      {personal.best_month && (
        <Text style={[s.subLabel, { marginTop: 16, color: '#FF0066' }]}>
          Tu mejor mes: {personal.best_month} con {personal.best_month_days} días
        </Text>
      )}
    </SlideWrapper>,

    // 3 — Constancia %
    <SlideWrapper key={3} colors={SLIDE_COLORS[3]}>
      <Text style={s.eyebrow}>TU CONSTANCIA</Text>
      <View style={s.ringContainer}>
        <View style={[s.ringOuter, { borderColor: '#FF0066' }]}>
          <View style={s.ringInner}>
            <Text style={s.ringNumber}>{countDisplay}%</Text>
            <Text style={s.ringLabel}>asistencia</Text>
          </View>
        </View>
      </View>
      <Text style={s.subLabel}>
        De {Math.round(personal.planned_days)} días planeados, fuiste {personal.total_days}
      </Text>
      {personal.missed_days > 0 && (
        <Text style={[s.subLabel, { color: '#ff6666', marginTop: 8 }]}>
          Faltaste {Math.round(personal.missed_days)} días que tenías planeado ir
        </Text>
      )}
    </SlideWrapper>,

    // 4 — Racha máxima
    <SlideWrapper key={4} colors={SLIDE_COLORS[4]}>
      <Text style={s.eyebrow}>TU MEJOR RACHA</Text>
      <Text style={s.numberHuge}>{countDisplay}</Text>
      <Text style={s.numberLabel}>días seguidos</Text>
      <Ionicons name="flame" size={60} color="#FF6B35" style={{ marginTop: 16 }} />
    </SlideWrapper>,

    // 5 — Hora favorita
    <SlideWrapper key={5} colors={SLIDE_COLORS[5]}>
      <Text style={s.eyebrow}>TU HORA FAVORITA</Text>
      <Text style={s.numberHuge}>{formatHour(personal.favorite_hour)}</Text>
      <Text style={s.numberLabel}>es cuando más vas</Text>
      <Ionicons
        name={personal.favorite_hour !== null && personal.favorite_hour < 12 ? 'sunny-outline' : 'moon-outline'}
        size={50} color="#FFD700" style={{ marginTop: 16 }}
      />
    </SlideWrapper>,

    // 6 — Día favorito
    <SlideWrapper key={6} colors={SLIDE_COLORS[6]}>
      <Text style={s.eyebrow}>TU DÍA FAVORITO</Text>
      <Text style={s.bigLabel}>{personal.favorite_day ?? '—'}</Text>
      <Text style={s.numberLabel}>el día que más vas</Text>
      <Ionicons name="calendar-outline" size={50} color="#FFD700" style={{ marginTop: 16 }} />
    </SlideWrapper>,

    // 7 — Fotos cámara + journey
    <SlideWrapper key={7} colors={SLIDE_COLORS[7]}>
      <Text style={s.eyebrow}>TUS FOTOS</Text>
      <Text style={s.numberHuge}>{countDisplay}</Text>
      <Text style={s.numberLabel}>fotos en total</Text>
      <View style={{ flexDirection: 'row', gap: 24, marginTop: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="camera-outline" size={28} color="#00cfff" />
          <Text style={[s.subLabel, { marginTop: 4 }]}>{personal.camera_photos} asistencia</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="images-outline" size={28} color="#00cfff" />
          <Text style={[s.subLabel, { marginTop: 4 }]}>{personal.journey_photos ?? 0} journey</Text>
        </View>
      </View>
    </SlideWrapper>,

    // 8 — Confirmaciones recibidas
    <SlideWrapper key={8} colors={SLIDE_COLORS[8]}>
      <Text style={s.eyebrow}>TE CONFIRMARON</Text>
      <Text style={s.numberHuge}>{countDisplay}</Text>
      <Text style={s.numberLabel}>veces confirmaron tus fotos</Text>
      <Ionicons name="shield-checkmark-outline" size={50} color="#00ff88" style={{ marginTop: 16 }} />
      {sala.most_confirmations && (
        <Text style={[s.subLabel, { marginTop: 16 }]}>
          {sala.most_confirmations.name} es quien más confirmó en la sala ({sala.most_confirmations.count})
        </Text>
      )}
    </SlideWrapper>,

    // 9 — Badges
    <SlideWrapper key={9} colors={SLIDE_COLORS[9]}>
      <Text style={s.eyebrow}>TUS LOGROS</Text>
      <Text style={[s.numberHuge, { fontSize: 72 }]}>{countDisplay}</Text>
      <Text style={s.numberLabel}>badges desbloqueados</Text>
      {personal.badges_keys.length === 0 ? (
        <Text style={[s.subLabel, { marginTop: 20 }]}>Aún no has ganado ninguno... sigue intentando</Text>
      ) : (
        <View style={s.badgeGrid}>
          {personal.badges_keys.slice(0, 6).map(k => {
            const info = BADGE_MAP[k] ?? { icon: 'medal-outline', name: k };
            return (
              <View key={k} style={s.badgeGridItem}>
                <View style={s.badgeIconCircle}>
                  <Ionicons name={info.icon as any} size={26} color="#FFD700" />
                </View>
                <Text style={s.badgeItemName}>{info.name}</Text>
              </View>
            );
          })}
          {personal.badges_keys.length > 6 && (
            <View style={s.badgeGridItem}>
              <View style={s.badgeIconCircle}>
                <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 16 }}>
                  +{personal.badges_keys.length - 6}
                </Text>
              </View>
              <Text style={s.badgeItemName}>más</Text>
            </View>
          )}
        </View>
      )}
    </SlideWrapper>,

    // 10 — PERSONALIDAD (el reveal)
    <SlideWrapper key={10} colors={SLIDE_COLORS[10]}>
      <Text style={[s.eyebrow, { color: '#FF0066' }]}>TU TIPO DE GYM-GOER ES...</Text>
      <View style={s.personalityCard}>
        <Ionicons name={personal.personality.icon as any} size={64} color="#FF0066" />
        <Text style={s.personalityName}>{personal.personality.name}</Text>
        <Text style={s.personalityDesc}>{personal.personality.desc}</Text>
      </View>
    </SlideWrapper>,

    // 11 — Mi posición en la sala
    <SlideWrapper key={11} colors={SLIDE_COLORS[11]}>
      <Text style={s.eyebrow}>TU POSICIÓN EN LA SALA</Text>
      {personal.my_rank ? (
        <>
          <Text style={s.numberHuge}>{ordinal(personal.my_rank)}</Text>
          <Text style={s.numberLabel}>puesto de {sala.member_count} miembros</Text>
          {personal.my_rank === 1 && (
            <Text style={[s.subLabel, { color: '#FFD700', marginTop: 16 }]}>
              Eres el más constante de la sala 👑
            </Text>
          )}
          {personal.my_rank === sala.member_count && sala.member_count > 1 && (
            <Text style={[s.subLabel, { color: '#ff8888', marginTop: 16 }]}>
              Último lugar... pero al menos participas
            </Text>
          )}
        </>
      ) : (
        <Text style={s.subLabel}>Sin ranking disponible</Text>
      )}
    </SlideWrapper>,

    // 12 — Mejor mes
    <SlideWrapper key={12} colors={SLIDE_COLORS[12]}>
      <Text style={s.eyebrow}>TU MEJOR MES</Text>
      {personal.best_month ? (
        <>
          <Text style={[s.bigLabel, { color: '#FF6B35' }]}>{personal.best_month}</Text>
          <Text style={s.numberHuge}>{countDisplay}</Text>
          <Text style={s.numberLabel}>días ese mes</Text>
        </>
      ) : (
        <Text style={s.subLabel}>Sin datos suficientes</Text>
      )}
      <Ionicons name="star-outline" size={44} color="#FFD700" style={{ marginTop: 16 }} />
    </SlideWrapper>,

    // 13 — Sala total días
    <SlideWrapper key={13} colors={SLIDE_COLORS[13]}>
      <Text style={s.eyebrow}>JUNTOS EN LA SALA</Text>
      <Text style={s.numberHuge}>{countDisplay}</Text>
      <Text style={s.numberLabel}>días entre todos los miembros</Text>
      <Text style={s.subLabel}>{sala.member_count} personas en la sala</Text>
    </SlideWrapper>,

    // 14 — Ranking de miembros con fotos
    <SlideWrapper key={14} colors={SLIDE_COLORS[14]}>
      <Text style={s.eyebrow}>RANKING DE LA SALA</Text>
      <ScrollView style={s.rankingScroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.rankingContent}>
        {sala.members_ranking.map((m, i) => (
          <View key={m.user_id} style={s.rankRow}>
            <Text style={[s.rankNum, i === 0 && s.rankNumGold]}>{i + 1}</Text>
            <MemberAvatar member={m} size={44} border={i === 0} />
            <View style={s.rankInfo}>
              <Text style={[s.rankName, i === 0 && { color: '#FFD700' }]}>{m.name}</Text>
              <Text style={s.rankDays}>{m.days} días</Text>
            </View>
            {i === 0 && <Ionicons name="trophy" size={20} color="#FFD700" />}
            {i === sala.members_ranking.length - 1 && sala.members_ranking.length > 1 && (
              <Ionicons name="skull-outline" size={18} color="#ff6666" />
            )}
          </View>
        ))}
      </ScrollView>
    </SlideWrapper>,

    // 15 — Mensajes
    <SlideWrapper key={15} colors={SLIDE_COLORS[15]}>
      <Text style={s.eyebrow}>EL CHAT</Text>
      <Text style={s.numberHuge}>{countDisplay}</Text>
      <Text style={s.numberLabel}>mensajes enviados en la sala</Text>
      <Ionicons name="chatbubbles-outline" size={50} color="#00ff88" style={{ marginTop: 16 }} />
    </SlideWrapper>,

    // 16 — Días grupales
    <SlideWrapper key={16} colors={SLIDE_COLORS[16]}>
      <Text style={s.eyebrow}>DÍAS QUE TODOS FUERON</Text>
      <Text style={s.numberHuge}>{countDisplay}</Text>
      <Text style={s.numberLabel}>veces que toda la sala fue junta</Text>
      <Ionicons name="people-outline" size={50} color="#ff6666" style={{ marginTop: 16 }} />
    </SlideWrapper>,

    // 17 — Final card
    <SlideWrapper key={17} colors={SLIDE_COLORS[17]}>
      <LinearGradient
        colors={['#FF006633', '#00000000']}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="barbell-outline" size={40} color="#FF0066" />
      <Text style={[s.bigLabel, { marginTop: 16 }]}>{data.sala_name}</Text>
      <View style={s.finalStats}>
        <View style={s.finalStat}>
          <Text style={s.finalStatNum}>{personal.total_days}</Text>
          <Text style={s.finalStatLabel}>días tuyos</Text>
        </View>
        <View style={s.finalStatDivider} />
        <View style={s.finalStat}>
          <Text style={s.finalStatNum}>{personal.max_streak}</Text>
          <Text style={s.finalStatLabel}>racha max</Text>
        </View>
        <View style={s.finalStatDivider} />
        <View style={s.finalStat}>
          <Text style={s.finalStatNum}>{personal.badges_earned}</Text>
          <Text style={s.finalStatLabel}>badges</Text>
        </View>
      </View>
      {personal.my_rank && (
        <Text style={[s.subLabel, { marginTop: 12 }]}>
          Posición {ordinal(personal.my_rank)} de {sala.member_count} en la sala
        </Text>
      )}
      <Text style={[s.personalityName, { fontSize: 18, marginTop: 12 }]}>
        {personal.personality.name}
      </Text>
      {sala.most_consistent && sala.most_consistent.user_id !== undefined && (
        <Text style={[s.subLabel, { marginTop: 8 }]}>
          MVP: {sala.most_consistent.name} con {sala.most_consistent.days} días
        </Text>
      )}
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Text style={s.closeBtnText}>Cerrar Wrapped</Text>
      </TouchableOpacity>
    </SlideWrapper>,
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Progress bar */}
      <View style={[s.progressBar, { paddingTop: insets.top + 8 }]}>
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <View key={i} style={[s.progressSegment, { backgroundColor: i <= slide ? '#FF0066' : '#ffffff33' }]} />
        ))}
      </View>

      {/* Close */}
      <TouchableOpacity style={[s.closeTop, { top: insets.top + 8 }]} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Slide content */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {slides[slide]}
      </Animated.View>

      {/* Tap zones */}
      <View style={s.tapZones} pointerEvents="box-none">
        <Pressable style={s.tapLeft}  onPress={goPrev} />
        <Pressable style={s.tapRight} onPress={goNext} />
      </View>
    </View>
  );
}

function SlideWrapper({ colors, children }: { colors: [string, string]; children: React.ReactNode }) {
  return (
    <LinearGradient colors={colors} style={s.slide}>
      {children}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  loading:      { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingText:  { color: '#fff', fontSize: 16 },
  slide:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 80 },
  progressBar:  { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', gap: 3, paddingHorizontal: 12, zIndex: 10 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2 },
  closeTop:     { position: 'absolute', right: 16, zIndex: 10 },
  tapZones:     { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapLeft:      { flex: 1 },
  tapRight:     { flex: 1 },

  eyebrow:      { fontSize: 11, letterSpacing: 3, color: '#ffffff88', textTransform: 'uppercase', marginBottom: 16 },
  bigLabel:     { fontSize: 42, fontWeight: '900', color: '#fff', textAlign: 'center' },
  numberHuge:   { fontSize: 96, fontWeight: '900', color: '#FF0066', lineHeight: 100 },
  numberLabel:  { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 8 },
  subLabel:     { fontSize: 14, color: '#ffffff88', textAlign: 'center', marginTop: 12 },
  hint:         { fontSize: 13, color: '#ffffff55', textAlign: 'center' },
  divider:      { width: 60, height: 3, backgroundColor: '#FF0066', borderRadius: 2, marginVertical: 20 },

  ringContainer:    { marginVertical: 24 },
  ringOuter:        { width: 180, height: 180, borderRadius: 90, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
  ringInner:        { alignItems: 'center' },
  ringNumber:       { fontSize: 48, fontWeight: '900', color: '#FF0066' },
  ringLabel:        { fontSize: 12, color: '#ffffff88', marginTop: 4 },

  badgeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20, justifyContent: 'center', maxWidth: 300 },
  badgeGridItem:   { alignItems: 'center', width: 80 },
  badgeIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFD70022', borderWidth: 1.5, borderColor: '#FFD70066', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  badgeItemName:   { fontSize: 10, color: '#ffffffcc', textAlign: 'center', lineHeight: 13 },

  personalityCard: { alignItems: 'center', backgroundColor: '#ffffff0a', borderRadius: 24, padding: 28, marginTop: 16, borderWidth: 1, borderColor: '#FF006644' },
  personalityName: { fontSize: 28, fontWeight: '900', color: '#FF0066', marginTop: 16, textAlign: 'center' },
  personalityDesc: { fontSize: 15, color: '#ffffffaa', marginTop: 12, textAlign: 'center', lineHeight: 22 },

  avatarFallback: { backgroundColor: '#FF006633', justifyContent: 'center', alignItems: 'center' },

  // Monthly bar chart
  barChart:     { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140, marginVertical: 16 },
  barCol:       { alignItems: 'center', flex: 1 },
  bar:          { width: '100%', maxWidth: 22, borderRadius: 4, minHeight: 4 },
  barMonth:     { fontSize: 8, color: '#ffffff66', marginTop: 4 },
  barValue:     { fontSize: 8, color: '#ffffffaa', marginBottom: 2 },

  // Member ranking
  rankingScroll:   { width: '100%', maxHeight: 340, marginTop: 12 },
  rankingContent:  { gap: 10, paddingBottom: 8 },
  rankRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff08', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  rankNum:         { fontSize: 18, fontWeight: '900', color: '#ffffff66', width: 24 },
  rankNumGold:     { color: '#FFD700' },
  rankInfo:        { flex: 1 },
  rankName:        { fontSize: 15, fontWeight: '700', color: '#fff' },
  rankDays:        { fontSize: 12, color: '#ffffff66', marginTop: 2 },

  finalStats:       { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 0 },
  finalStat:        { alignItems: 'center', paddingHorizontal: 16 },
  finalStatNum:     { fontSize: 32, fontWeight: '900', color: '#FF0066' },
  finalStatLabel:   { fontSize: 11, color: '#ffffff88', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  finalStatDivider: { width: 1, height: 40, backgroundColor: '#ffffff22' },

  closeBtn:     { marginTop: 28, backgroundColor: '#FF0066', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
