import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { battleApi } from '../../services/api';
import { storage } from '../../services/storage';

const C = {
  bg: '#0a0a0a', card: '#141414', border: '#1e1e1e',
  pink: '#FF0066', text: '#ffffff', muted: '#888',
  green: '#00cc66', blue: '#0066ff',
};

type Battle = {
  id: number;
  challenger_id: number;
  challenger_name: string;
  opponent_id: number;
  opponent_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'finished';
  winner_id: number | null;
  invite_code: string;
};

type BattleStats = {
  sala: { id: number; name: string };
  total_days: number;
  pct: number;
  member_count: number;
};

export default function BattleScreen() {
  const { challengeId, challengeName } = useLocalSearchParams<{ challengeId: string; challengeName: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [battles, setBattles]   = useState<Battle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [opponentCode, setOpponentCode] = useState('');
  const [duration, setDuration] = useState('14');
  const [activeBattle, setActiveBattle] = useState<{ battle: Battle; challenger: BattleStats; opponent: BattleStats; my_sala: string } | null>(null);

  const load = useCallback(async () => {
    const token = await storage.get('token');
    if (!token) return;
    try {
      const res = await battleApi.list(token);
      setBattles(res.data);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBattle = async () => {
    if (!opponentCode.trim()) {
      Alert.alert('Falta el código', 'Ingresa el código de invitación de la sala rival.');
      return;
    }
    const token = await storage.get('token');
    if (!token || !challengeId) return;
    setCreating(true);
    try {
      await battleApi.create(parseInt(challengeId), opponentCode.trim().toUpperCase(), parseInt(duration), token);
      setOpponentCode('');
      Alert.alert('¡Reto enviado!', 'La sala rival recibirá una notificación para aceptar el reto.');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo enviar el reto.');
    }
    setCreating(false);
  };

  const acceptBattle = async (id: number) => {
    const token = await storage.get('token');
    if (!token) return;
    try {
      await battleApi.accept(id, token);
      Alert.alert('¡Reto aceptado!', 'El reto empieza mañana. ¡Que gane el mejor!');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo aceptar.');
    }
  };

  const openBattle = async (id: number) => {
    const token = await storage.get('token');
    if (!token) return;
    try {
      const res = await battleApi.show(id, token);
      setActiveBattle(res.data);
    } catch (_) {}
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.pink} /></View>;
  }

  if (activeBattle) {
    return <BattleDetail data={activeBattle} onBack={() => setActiveBattle(null)} />;
  }

  const myBattles = battles.filter(b =>
    b.challenger_id === parseInt(challengeId ?? '0') ||
    b.opponent_id   === parseInt(challengeId ?? '0')
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>Sala vs Sala</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Crear reto */}
        <View style={s.createCard}>
          <Text style={s.createTitle}>Retar otra sala</Text>
          <Text style={s.createSub}>
            Ingresa el código de la sala rival ({challengeName} vs ?)
          </Text>
          <TextInput
            style={s.codeInput}
            value={opponentCode}
            onChangeText={t => setOpponentCode(t.toUpperCase())}
            placeholder="Código de sala rival"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            maxLength={6}
          />
          <View style={s.durationRow}>
            {['7', '14', '30'].map(d => (
              <Pressable
                key={d}
                style={[s.durationBtn, duration === d && s.durationBtnActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[s.durationBtnText, duration === d && { color: '#fff' }]}>{d} días</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[s.retarBtn, creating && { opacity: 0.6 }]} onPress={createBattle} disabled={creating}>
            {creating
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="flash-outline" size={18} color="#fff" />
                  <Text style={s.retarBtnText}>Enviar reto</Text>
                </>
            }
          </Pressable>
        </View>

        {/* Mis retos */}
        {myBattles.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Retos activos y pasados</Text>
            {myBattles.map(b => (
              <BattleCard
                key={b.id}
                battle={b}
                myId={parseInt(challengeId ?? '0')}
                onOpen={() => openBattle(b.id)}
                onAccept={() => acceptBattle(b.id)}
              />
            ))}
          </>
        )}

        {myBattles.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="flash-outline" size={40} color={C.muted} />
            <Text style={s.emptyText}>Ningún reto todavía.{'\n'}¡Reta a una sala y demuestra quiénes son mejores!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function BattleCard({ battle: b, myId, onOpen, onAccept }: {
  battle: Battle; myId: number; onOpen: () => void; onAccept: () => void;
}) {
  const isChallenger = b.challenger_id === myId;
  const myName    = isChallenger ? b.challenger_name : b.opponent_name;
  const theirName = isChallenger ? b.opponent_name   : b.challenger_name;
  const canAccept = b.status === 'pending' && !isChallenger;

  const statusColor = b.status === 'active' ? C.green : b.status === 'pending' ? '#ffaa00' : C.muted;
  const statusText  = b.status === 'active' ? 'En curso' : b.status === 'pending' ? 'Pendiente' : 'Terminado';

  return (
    <Pressable style={s.battleCard} onPress={onOpen}>
      <View style={s.battleHeader}>
        <Text style={[s.battleStatus, { color: statusColor }]}>{statusText}</Text>
        <Text style={s.battleDates}>{b.start_date} → {b.end_date}</Text>
      </View>
      <View style={s.vsRow}>
        <Text style={s.vsName}>{myName}</Text>
        <Text style={s.vs}>VS</Text>
        <Text style={s.vsName}>{theirName}</Text>
      </View>
      {b.winner_id !== null && (
        <Text style={[s.winnerText, { color: b.winner_id === myId ? C.green : '#ff4444' }]}>
          {b.winner_id === myId ? '🏆 Ganaste' : '💀 Perdiste'}
        </Text>
      )}
      {canAccept && (
        <Pressable style={s.acceptBtn} onPress={e => { e.stopPropagation?.(); onAccept(); }}>
          <Text style={s.acceptBtnText}>Aceptar reto</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function BattleDetail({ data, onBack }: {
  data: { battle: Battle; challenger: BattleStats; opponent: BattleStats; my_sala: string };
  onBack: () => void;
}) {
  const { battle, challenger, opponent, my_sala } = data;
  const me    = my_sala === 'challenger' ? challenger : opponent;
  const them  = my_sala === 'challenger' ? opponent : challenger;
  const winning = me.pct >= them.pct;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: 20 }]}>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.title}>{me.sala.name} vs {them.sala.name}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.sectionTitle, { textAlign: 'center', marginBottom: 24 }]}>
          {battle.start_date} → {battle.end_date}
        </Text>

        <View style={s.statsRow}>
          <SalaStatBox name={me.sala.name} pct={me.pct} days={me.total_days} highlight={winning} label="TÚ" />
          <Text style={s.vsLarge}>VS</Text>
          <SalaStatBox name={them.sala.name} pct={them.pct} days={them.total_days} highlight={!winning} label="ELLOS" />
        </View>

        <View style={s.barRaceContainer}>
          <View style={[s.barRace, { width: `${me.pct}%`, backgroundColor: C.pink }]} />
          <View style={[s.barRace, { width: `${them.pct}%`, backgroundColor: C.blue }]} />
        </View>

        {battle.status === 'finished' && battle.winner_id !== null && (
          <View style={s.winnerBanner}>
            <Text style={s.winnerBannerText}>
              {battle.winner_id === me.sala.id ? `🏆 ${me.sala.name} ganó el reto!` : `🥊 ${them.sala.name} ganó el reto`}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SalaStatBox({ name, pct, days, highlight, label }: {
  name: string; pct: number; days: number; highlight: boolean; label: string;
}) {
  return (
    <View style={[s.statBox, highlight && s.statBoxHighlight]}>
      <Text style={s.statBoxLabel}>{label}</Text>
      <Text style={s.statBoxName}>{name}</Text>
      <Text style={[s.statBoxPct, { color: highlight ? C.pink : C.muted }]}>{pct}%</Text>
      <Text style={s.statBoxDays}>{days} días</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:   { width: 40 },
  title:     { flex: 1, textAlign: 'center', color: C.text, fontSize: 16, fontWeight: '700' },
  scroll:    { padding: 20, paddingBottom: 40 },

  createCard:  { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: C.border },
  createTitle: { color: C.text, fontWeight: '900', fontSize: 18, marginBottom: 4 },
  createSub:   { color: C.muted, fontSize: 13, marginBottom: 16 },
  codeInput:   { backgroundColor: '#1a1a1a', color: C.text, fontSize: 18, fontWeight: '700', borderRadius: 10, padding: 12, marginBottom: 14, letterSpacing: 3, textAlign: 'center' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  durationBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a1a', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  durationBtnActive: { backgroundColor: C.pink, borderColor: C.pink },
  durationBtnText:   { color: C.muted, fontWeight: '700' },
  retarBtn:    { backgroundColor: C.pink, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  retarBtnText:{ color: '#fff', fontWeight: '800', fontSize: 15 },

  sectionTitle:  { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  battleCard:    { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  battleHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  battleStatus:  { fontWeight: '700', fontSize: 12 },
  battleDates:   { color: C.muted, fontSize: 11 },
  vsRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vsName:        { flex: 1, color: C.text, fontWeight: '700', fontSize: 15 },
  vs:            { color: C.pink, fontWeight: '900', fontSize: 13 },
  winnerText:    { fontWeight: '700', marginTop: 10, fontSize: 14 },
  acceptBtn:     { marginTop: 12, backgroundColor: C.green, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '800' },

  emptyBox:   { alignItems: 'center', gap: 14, paddingVertical: 40 },
  emptyText:  { color: C.muted, textAlign: 'center', lineHeight: 22 },

  statsRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  vsLarge:        { color: C.pink, fontWeight: '900', fontSize: 20 },
  statBox:        { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statBoxHighlight:{ borderColor: C.pink },
  statBoxLabel:   { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  statBoxName:    { color: C.text, fontWeight: '800', fontSize: 13, textAlign: 'center', marginVertical: 4 },
  statBoxPct:     { fontSize: 36, fontWeight: '900' },
  statBoxDays:    { color: C.muted, fontSize: 11, marginTop: 2 },
  barRaceContainer: { gap: 8, marginBottom: 24 },
  barRace:          { height: 10, borderRadius: 5, minWidth: 4 },
  winnerBanner:     { backgroundColor: '#1a1a00', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ffaa0044' },
  winnerBannerText: { color: '#ffaa00', fontWeight: '800', fontSize: 15 },
});
