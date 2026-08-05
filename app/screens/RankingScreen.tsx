import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  Image, Platform, StatusBar, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../context/ThemeContext';
import { userApi, challengeApi, getStorageUrl } from '../../services/api';
import { storage } from '../../services/storage';

const PERIODS = [
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes'   },
  { key: 'año',    label: 'Año'   },
] as const;
type Period = 'semana' | 'mes' | 'año';

const PODIUM_COLORS = ['#C0C0C0', '#FFD700', '#CD7F32'];

interface Participant {
  id: number;
  username: string;
  avatar_url: string | null;
  rank: number;
  points: number;
  sessions: number;
  total_reps: number;
  attendance_count: number;
}

interface Room { id: number; name: string; }

function AvatarBubble({ url, name, size }: { url: string | null; name: string; size: number }) {
  const [err, setErr] = useState(false);
  if (url && !err) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FF006620', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FF0066', fontSize: size * 0.4, fontWeight: '800' }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function RankingScreen() {
  const { C } = useColors();
  const [period,    setPeriod]    = useState<Period>('semana');
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [roomId,    setRoomId]    = useState<number | null>(null);
  const [entries,   setEntries]   = useState<Participant[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [token,     setToken]     = useState('');
  const [myId,      setMyId]      = useState<number | null>(null);

  const loadRooms = async (tkn: string) => {
    try {
      const res = await userApi.myChallenges(tkn);
      const rs: Room[] = (res.data.challenges ?? []).map((c: any) => ({ id: c.id, name: c.name }));
      setRooms(rs);
      if (rs.length > 0 && !roomId) {
        setRoomId(rs[0].id);
        loadLeaderboard(tkn, rs[0].id, period);
      }
    } catch {}
  };

  const loadLeaderboard = async (tkn: string, rid: number, p: Period) => {
    setLoading(true);
    try {
      const res = await challengeApi.leaderboard(rid, p, tkn);
      setEntries(res.data.participants ?? []);
    } catch { setEntries([]); }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => {
    (async () => {
      const [t, uRaw] = await Promise.all([storage.get('token'), storage.get('user')]);
      if (t) {
        setToken(t);
        if (uRaw) { try { setMyId(JSON.parse(uRaw).id); } catch {} }
        loadRooms(t);
      }
    })();
  }, []));

  const selectPeriod = (p: Period) => {
    setPeriod(p);
    if (roomId && token) loadLeaderboard(token, roomId, p);
  };

  const selectRoom = (id: number) => {
    setRoomId(id);
    if (token) loadLeaderboard(token, id, period);
  };

  const top3 = entries.slice(0, 3);
  const rest  = entries.slice(3);
  const myEntry = entries.find(e => e.id === myId);
  const myRank  = myEntry ? entries.indexOf(myEntry) + 1 : null;

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />

      <FlatList
        data={rest}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListHeaderComponent={
          <>
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <LinearGradient colors={[C.mugenPink + '28', 'transparent']} style={s.headerGrad}>
              <View style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 56, paddingHorizontal: 24, paddingBottom: 16 }}>
                <Text style={[s.headerTitle, { color: C.textPrimary }]}>Ranking</Text>
                <Text style={[s.headerSub, { color: C.textSecondary }]}>Compite · Supera · Domina</Text>
              </View>
            </LinearGradient>

            {/* ── ROOM SELECTOR ───────────────────────────────────────── */}
            {rooms.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.roomRow}>
                {rooms.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => selectRoom(r.id)}
                    style={[s.roomChip, { backgroundColor: C.card, borderColor: C.border }, roomId === r.id && { backgroundColor: C.mugenPink, borderColor: C.mugenPink }]}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.roomChipTxt, { color: roomId === r.id ? '#fff' : C.textSecondary }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* ── PERIOD TABS ─────────────────────────────────────────── */}
            <View style={[s.tabBar, { backgroundColor: C.card, borderColor: C.border }]}>
              {PERIODS.map(({ key, label }) => (
                <TouchableOpacity key={key} onPress={() => selectPeriod(key)} style={[s.tab, period === key && s.tabActive]} activeOpacity={0.7}>
                  <Text style={[s.tabText, { color: period === key ? '#FFF' : C.textSecondary }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── PODIO ───────────────────────────────────────────────── */}
            {loading ? (
              <ActivityIndicator color={C.mugenPink} style={{ marginVertical: 48 }} />
            ) : entries.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                <Ionicons name="trophy-outline" size={42} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: 14 }}>Sin datos para este período</Text>
              </View>
            ) : (
              <>
                <View style={s.podiumRow}>
                  {podiumOrder.map((u, idx) => {
                    const realRank = top3.indexOf(u); // 0=1st, 1=2nd, 2=3rd
                    const isWinner = realRank === 0;
                    const color    = PODIUM_COLORS[realRank] ?? '#888';
                    const size     = isWinner ? 80 : 64;
                    const isMe     = u.id === myId;
                    const avatarUrl = u.avatar_url ? getStorageUrl(u.avatar_url) : null;
                    return (
                      <View key={u.id} style={[s.podiumItem, isWinner && s.podiumWinner]}>
                        {isWinner && <MaterialCommunityIcons name="crown" size={26} color="#FFD700" style={{ marginBottom: -2 }} />}
                        <View style={[s.podiumRing, { borderColor: color, width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
                          <AvatarBubble url={avatarUrl} name={u.username} size={size} />
                        </View>
                        <View style={[s.rankBadge, { backgroundColor: color }]}>
                          <Text style={s.rankBadgeText}>{realRank + 1}</Text>
                        </View>
                        <Text style={[s.podiumName, { color: isMe ? C.mugenPink : C.textPrimary }]} numberOfLines={1}>
                          {isMe ? 'Tú' : u.username.split(' ')[0]}
                        </Text>
                        <Text style={[s.podiumPts, { color }]}>{u.points.toLocaleString()} pts</Text>
                      </View>
                    );
                  })}
                </View>

                {rest.length > 0 && (
                  <Text style={[s.listLabel, { color: C.textPrimary }]}>Clasificación</Text>
                )}
              </>
            )}
          </>
        }
        renderItem={({ item }) => {
          const isMe  = item.id === myId;
          const avatarUrl = item.avatar_url ? getStorageUrl(item.avatar_url) : null;
          return (
            <View style={[s.rankRow, { backgroundColor: C.card, borderColor: isMe ? C.mugenPink + '60' : C.border }]}>
              <Text style={[s.rowRank, { color: isMe ? C.mugenPink : C.textSecondary }]}>#{item.rank}</Text>
              <AvatarBubble url={avatarUrl} name={item.username} size={38} />
              <Text style={[s.rowName, { color: isMe ? C.mugenPink : C.textPrimary }]} numberOfLines={1}>
                {isMe ? 'Tú' : item.username.split(' ')[0]}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.rowPts, { color: isMe ? C.mugenPink : C.textSecondary }]}>{item.points} pts</Text>
                <Text style={{ color: C.textMuted, fontSize: 10 }}>{item.sessions} sesiones</Text>
              </View>
            </View>
          );
        }}
      />

      {/* ── MI POSICIÓN FLOTANTE ──────────────────────────────────────── */}
      {myEntry && (
        <View style={s.myBar}>
          <LinearGradient colors={[C.mugenPink, C.mugenPinkDark ?? '#c00050']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={s.myBarLeft}>
            <AvatarBubble
              url={myEntry.avatar_url ? getStorageUrl(myEntry.avatar_url) : null}
              name={myEntry.username}
              size={34}
            />
            <View>
              <Text style={s.myBarLabel}>Tu posición</Text>
              <Text style={s.myBarRank}>#{myRank}</Text>
            </View>
          </View>
          <View style={s.myBarRight}>
            <Text style={s.myBarPts}>{myEntry.points} pts</Text>
            <MaterialCommunityIcons name="trending-up" size={18} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  headerGrad:    { paddingBottom: 4 },
  headerTitle:   { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  headerSub:     { fontSize: 14, marginTop: 2 },
  roomRow:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  roomChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, maxWidth: 160 },
  roomChipTxt:   { fontSize: 13, fontWeight: '700' },
  tabBar:        { flexDirection: 'row', marginHorizontal: 20, marginTop: 4, marginBottom: 4, borderRadius: 16, padding: 4, gap: 4, borderWidth: 1 },
  tab:           { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive:     { backgroundColor: '#FF2E63' },
  tabText:       { fontSize: 13, fontWeight: '700' },
  podiumRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 20, marginBottom: 28, gap: 8 },
  podiumItem:    { flex: 1, alignItems: 'center', gap: 6 },
  podiumWinner:  { transform: [{ translateY: -16 }] },
  podiumRing:    { borderWidth: 2.5, padding: 3, justifyContent: 'center', alignItems: 'center' },
  rankBadge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: -4 },
  rankBadgeText: { color: '#0D0D14', fontSize: 12, fontWeight: '900' },
  podiumName:    { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  podiumPts:     { fontSize: 12, fontWeight: '900' },
  listLabel:     { fontSize: 16, fontWeight: '900', marginHorizontal: 20, marginBottom: 10 },
  rankRow:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 16, borderWidth: 1, gap: 10 },
  rowRank:       { width: 30, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  rowName:       { flex: 1, fontSize: 14, fontWeight: '700' },
  rowPts:        { fontSize: 13, fontWeight: '900' },
  myBar:         { position: 'absolute', bottom: 90, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 20, overflow: 'hidden', shadowColor: '#FF2E63', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  myBarLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myBarLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  myBarRank:     { fontSize: 18, fontWeight: '900', color: '#FFF' },
  myBarRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myBarPts:      { fontSize: 18, fontWeight: '900', color: '#FFF' },
});
