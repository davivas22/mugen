import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { commitmentApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';

const C = {
  bg: '#0a0a0a', card: '#141414', border: '#1e1e1e',
  pink: '#FF0066', text: '#ffffff', muted: '#888',
  green: '#00cc66',
};

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type CommitmentMember = {
  user_id: number;
  name: string;
  avatar: string | null;
  committed_days: number[];
  attended_days: number[];
  has_commitment: boolean;
};

export default function CommitmentsScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [members, setMembers]     = useState<CommitmentMember[]>([]);
  const [myDays, setMyDays]       = useState<number[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [hasCommitment, setHasCommitment] = useState(false);

  const load = useCallback(async () => {
    const token = await storage.get('token');
    if (!token || !challengeId) return;
    try {
      const res = await commitmentApi.get(challengeId, token);
      setMembers(res.data.members);
      setWeekStart(res.data.week_start);
      if (res.data.my_commitment) {
        setMyDays(res.data.my_commitment);
        setHasCommitment(true);
      }
    } catch (_) {}
    setLoading(false);
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (d: number) => {
    setMyDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    );
  };

  const save = async () => {
    if (myDays.length === 0) {
      Alert.alert('Selecciona días', 'Elige al menos un día al que te comprometes ir.');
      return;
    }
    setSaving(true);
    const token = await storage.get('token');
    if (!token) return;
    try {
      await commitmentApi.set(challengeId!, myDays, token);
      setHasCommitment(true);
      await load();
    } catch (_) {
      Alert.alert('Error', 'No se pudo guardar el compromiso.');
    }
    setSaving(false);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.pink} /></View>;
  }

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Lun...6=Dom

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>Compromiso Semanal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.subtitle}>¿Qué días vas esta semana?</Text>
        <Text style={s.weekLabel}>Semana del {weekStart}</Text>

        {/* Selector de días */}
        <View style={s.dayPicker}>
          {DAY_LABELS.map((label, i) => {
            const selected  = myDays.includes(i);
            const isToday   = i === todayIdx;
            return (
              <Pressable
                key={i}
                style={[s.dayBtn, selected && s.dayBtnSelected, isToday && s.dayBtnToday]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[s.dayBtnLabel, selected && s.dayBtnLabelSelected]}>{label}</Text>
                {isToday && <View style={s.todayDot} />}
              </Pressable>
            );
          })}
        </View>

        {myDays.length > 0 && (
          <Text style={s.selectedLabel}>
            {myDays.map(d => DAY_NAMES[d]).join(', ')}
          </Text>
        )}

        <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>{hasCommitment ? 'Actualizar compromiso' : 'Confirmar compromiso'}</Text>}
        </Pressable>

        {/* Compromisos de la sala */}
        <Text style={s.sectionTitle}>Compromisos de la sala</Text>
        {members.map(m => <MemberCommitmentRow key={m.user_id} member={m} todayIdx={todayIdx} />)}
      </ScrollView>
    </View>
  );
}

function MemberCommitmentRow({ member: m, todayIdx }: { member: CommitmentMember; todayIdx: number }) {
  const url = getStorageUrl(m.avatar);

  return (
    <View style={s.memberCard}>
      <View style={s.memberTop}>
        {url
          ? <Image source={{ uri: url }} style={s.avatar} contentFit="cover" />
          : <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>{m.name.charAt(0).toUpperCase()}</Text>
            </View>
        }
        <Text style={s.memberName}>{m.name}</Text>
        {!m.has_commitment && <Text style={s.noPledge}>Sin compromiso</Text>}
      </View>
      {m.has_commitment && (
        <View style={s.daysRow}>
          {DAY_LABELS.map((label, i) => {
            const committed = m.committed_days.includes(i);
            const attended  = m.attended_days.includes(i);
            const isToday   = i === todayIdx;
            const isPast    = i < todayIdx;

            let bg = '#1a1a1a';
            let color = '#555';
            let icon: string | null = null;

            if (committed && attended) { bg = C.green; color = '#fff'; icon = 'checkmark'; }
            else if (committed && isPast && !attended) { bg = '#3a0000'; color = '#ff4444'; icon = 'close'; }
            else if (committed && isToday && !attended) { bg = C.pink + '33'; color = C.pink; }
            else if (committed) { bg = '#1a1a1a'; color = C.muted; }

            return (
              <View key={i} style={[s.dayChip, { backgroundColor: bg }]}>
                {icon
                  ? <Ionicons name={icon as any} size={12} color={color} />
                  : <Text style={[s.dayChipLabel, { color: committed ? C.pink : color }]}>{label}</Text>
                }
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:   { width: 40 },
  title:     { flex: 1, textAlign: 'center', color: C.text, fontSize: 17, fontWeight: '700' },
  scroll:    { padding: 20, paddingBottom: 40 },

  subtitle:   { color: C.muted, fontSize: 14, textAlign: 'center', marginBottom: 4 },
  weekLabel:  { color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 20 },

  dayPicker:        { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12 },
  dayBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  dayBtnSelected:   { backgroundColor: C.pink, borderColor: C.pink },
  dayBtnToday:      { borderColor: C.pink },
  dayBtnLabel:      { color: C.muted, fontWeight: '700', fontSize: 13 },
  dayBtnLabelSelected: { color: '#fff' },
  todayDot:         { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', position: 'absolute', bottom: 6 },
  selectedLabel:    { color: C.muted, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  saveBtn:          { backgroundColor: C.pink, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 32 },
  saveBtnText:      { color: '#fff', fontWeight: '800', fontSize: 15 },

  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  memberCard:   { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  memberTop:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:       { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { color: C.pink, fontWeight: '900', fontSize: 14 },
  memberName:   { flex: 1, color: C.text, fontWeight: '700', fontSize: 14 },
  noPledge:     { color: '#444', fontSize: 12 },

  daysRow:      { flexDirection: 'row', gap: 6 },
  dayChip:      { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  dayChipLabel: { fontSize: 11, fontWeight: '700' },
});
