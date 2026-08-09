import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pledgeApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';

const C = {
  bg: '#0a0a0a', card: '#141414', border: '#1e1e1e',
  pink: '#FF0066', text: '#ffffff', muted: '#888',
};

type PledgeMember = {
  user_id: number;
  name: string;
  avatar: string | null;
  target_days: number | null;
  current_days: number | null;
  fulfilled: boolean;
  has_pledge: boolean;
};

type PledgeData = {
  month: number;
  year: number;
  my_pledge: number | null;
  pledges: PledgeMember[];
};

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function PledgeScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [data, setData]       = useState<PledgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [input, setInput]     = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const token = await storage.get('token');
    if (!token || !challengeId) return;
    try {
      const res = await pledgeApi.get(challengeId, token);
      setData(res.data);
      if (res.data.my_pledge) setInput(String(res.data.my_pledge));
    } catch (_) {}
    setLoading(false);
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const days = parseInt(input);
    if (!days || days < 1 || days > 31) {
      Alert.alert('Número inválido', 'Pon un número entre 1 y 31.');
      return;
    }
    setSaving(true);
    const token = await storage.get('token');
    if (!token) return;
    try {
      await pledgeApi.set(challengeId!, days, token);
      setEditing(false);
      await load();
    } catch (_) {
      Alert.alert('Error', 'No se pudo guardar la apuesta.');
    }
    setSaving(false);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.pink} /></View>;
  }

  const monthName = data ? MONTH_NAMES[(data.month ?? 1) - 1] : '';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>La Apuesta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.subtitle}>¿Cuántos días prometes ir este mes?</Text>
        <Text style={s.monthLabel}>{monthName} {data?.year}</Text>

        {/* Mi apuesta */}
        <View style={s.myPledgeCard}>
          {!editing && !data?.my_pledge ? (
            <>
              <Text style={s.noPledgeText}>Todavía no has prometido nada este mes.</Text>
              <Pressable style={s.pledgeBtn} onPress={() => setEditing(true)}>
                <Text style={s.pledgeBtnText}>Hacer mi apuesta</Text>
              </Pressable>
            </>
          ) : editing || !data?.my_pledge ? (
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={C.muted}
                autoFocus
              />
              <Text style={s.inputLabel}>días este mes</Text>
              <Pressable style={s.saveBtn} onPress={save} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>Guardar</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={s.myPledgeRow}>
              <View>
                <Text style={s.myPledgeNumber}>{data.my_pledge}</Text>
                <Text style={s.myPledgeLabel}>días prometidos</Text>
              </View>
              <Pressable onPress={() => setEditing(true)} style={s.editBtn}>
                <Ionicons name="pencil-outline" size={16} color={C.muted} />
                <Text style={[s.myPledgeLabel, { marginLeft: 4 }]}>cambiar</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Lista de apuestas */}
        <Text style={s.sectionTitle}>Sala completa</Text>
        {(data?.pledges ?? []).map(m => (
          <MemberPledgeRow key={m.user_id} member={m} />
        ))}
      </ScrollView>
    </View>
  );
}

function MemberPledgeRow({ member: m }: { member: PledgeMember }) {
  const url = getStorageUrl(m.avatar);
  const pct = m.target_days && m.current_days !== null
    ? Math.min(100, Math.round((m.current_days / m.target_days) * 100))
    : 0;

  return (
    <View style={s.memberCard}>
      <View style={s.memberLeft}>
        {url
          ? <Image source={{ uri: url }} style={s.avatar} contentFit="cover" />
          : <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>{m.name.charAt(0).toUpperCase()}</Text>
            </View>
        }
        <View style={{ flex: 1 }}>
          <Text style={s.memberName}>{m.name}</Text>
          {m.has_pledge ? (
            <>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${pct}%`, backgroundColor: m.fulfilled ? '#00cc66' : C.pink }]} />
              </View>
              <Text style={s.barLabel}>{m.current_days} / {m.target_days} días</Text>
            </>
          ) : (
            <Text style={s.noPledge}>Sin apuesta este mes</Text>
          )}
        </View>
      </View>
      {m.fulfilled && <Ionicons name="checkmark-circle" size={22} color="#00cc66" />}
      {!m.fulfilled && m.has_pledge && <Text style={s.pctText}>{pct}%</Text>}
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
  monthLabel: { color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 24 },

  myPledgeCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: C.border },
  noPledgeText: { color: C.muted, textAlign: 'center', marginBottom: 14 },
  pledgeBtn:    { backgroundColor: C.pink, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  pledgeBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input:        { backgroundColor: '#1a1a1a', color: C.pink, fontSize: 36, fontWeight: '900', width: 64, textAlign: 'center', borderRadius: 10, paddingVertical: 6 },
  inputLabel:   { color: C.text, fontSize: 16, flex: 1 },
  saveBtn:      { backgroundColor: C.pink, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  saveBtnText:  { color: '#fff', fontWeight: '700' },
  myPledgeRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  myPledgeNumber:{ color: C.pink, fontSize: 48, fontWeight: '900' },
  myPledgeLabel: { color: C.muted, fontSize: 12 },
  editBtn:      { flexDirection: 'row', alignItems: 'center' },

  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  memberCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  memberLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 22 },
  avatarFallback:{ backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: C.pink, fontWeight: '900', fontSize: 18 },
  memberName:   { color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  barBg:        { height: 6, backgroundColor: '#1e1e1e', borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: 6, borderRadius: 3 },
  barLabel:     { color: C.muted, fontSize: 11, marginTop: 4 },
  noPledge:     { color: '#444', fontSize: 12 },
  pctText:      { color: C.muted, fontSize: 13, fontWeight: '700', marginLeft: 8 },
});
