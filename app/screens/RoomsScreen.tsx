import React, { useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  Image, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '../context/ThemeContext';

const FILTERS = ['Todas', 'Elite', 'Intermedio', 'Principiante'];

const ROOMS = [
  { id: '1', name: 'Titanes del CrossFit',   image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800', participants: 124, level: 'Elite',         active: true,  challenge: '100 Burpees hoy' },
  { id: '2', name: 'Boxeo Nocturno',          image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=800', participants: 85,  level: 'Intermedio',    active: true,  challenge: 'Sparring virtual' },
  { id: '3', name: 'Yoga Flow & Mindfulness', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800', participants: 42,  level: 'Principiante',  active: false, challenge: 'Reto de flexibilidad' },
  { id: '4', name: 'Fuerza & Potencia',       image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800', participants: 98, level: 'Elite',         active: true,  challenge: 'PR en sentadilla' },
];

const CHALLENGES = [
  { id: '1', title: '100 Burpees', reward: '+500 MC',    icon: 'flash',    color: '#FF2E63' },
  { id: '2', title: '5km Run',     reward: '+1200 MC',   icon: 'run-fast', color: '#00D4FF' },
  { id: '3', title: 'Racha 7 días',reward: 'Medalla Oro',icon: 'trophy',   color: '#FFD700' },
  { id: '4', title: 'Plancha 3min',reward: '+300 MC',    icon: 'arm-flex', color: '#7C3AED' },
];

const LEVEL_COLORS: Record<string, string> = {
  Elite: '#FF2E63', Intermedio: '#00D4FF', Principiante: '#00D395',
};

export default function RoomsScreen() {
  const [filter, setFilter] = useState('Todas');
  const router = useRouter();
  const { C } = useColors();

  const filtered = filter === 'Todas' ? ROOMS : ROOMS.filter(r => r.level === filter);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <View style={[s.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 56 }]}>
              <View>
                <Text style={[s.title, { color: C.textPrimary }]}>Salas</Text>
                <Text style={[s.subtitle, { color: C.textSecondary }]}>Elige tu batalla</Text>
              </View>
              <TouchableOpacity style={[s.searchBtn, { backgroundColor: C.card, borderColor: C.border }]}>
                <MaterialCommunityIcons name="magnify" size={22} color={C.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Retos semanales</Text>
            <FlatList
              data={CHALLENGES}
              horizontal showsHorizontalScrollIndicator={false}
              keyExtractor={c => c.id}
              contentContainerStyle={s.challengeList}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.challengeCard, { backgroundColor: C.card, borderColor: C.border }]} activeOpacity={0.8}>
                  <LinearGradient colors={[item.color + '25', item.color + '08']} style={StyleSheet.absoluteFill} borderRadius={20} />
                  <View style={[s.challengeIcon, { backgroundColor: item.color + '20' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={[s.challengeTitle, { color: C.textPrimary }]}>{item.title}</Text>
                  <Text style={[s.challengeReward, { color: item.color }]}>{item.reward}</Text>
                </TouchableOpacity>
              )}
            />

            <View style={s.filtersRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[s.chip, { backgroundColor: filter === f ? C.mugenPink : C.card, borderColor: filter === f ? C.mugenPink : C.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, { color: filter === f ? '#FFF' : C.textSecondary }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Salas activas</Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.roomCard} activeOpacity={0.85} onPress={() => router.push('/screens/RoomDetailScreen' as any)}>
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFillObject as any} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFillObject as any} />
            {item.active && (
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>EN VIVO</Text>
              </View>
            )}
            <View style={[s.levelBadge, { backgroundColor: (LEVEL_COLORS[item.level] ?? '#94A3B8') + '22', borderColor: (LEVEL_COLORS[item.level] ?? '#94A3B8') + '80' }]}>
              <Text style={[s.levelText, { color: LEVEL_COLORS[item.level] ?? '#94A3B8' }]}>{item.level}</Text>
            </View>
            <View style={s.roomInfo}>
              <Text style={s.roomName}>{item.name}</Text>
              <View style={s.roomMeta}>
                <MaterialCommunityIcons name="account-multiple" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.roomMetaText}>{item.participants}</Text>
                <View style={s.dot} />
                <MaterialCommunityIcons name="flag-checkered" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.roomMetaText}>{item.challenge}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1 },
  list:           { paddingBottom: 20 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  title:          { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle:       { fontSize: 14, marginTop: 2 },
  searchBtn:      { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  sectionTitle:   { fontSize: 18, fontWeight: '900', marginHorizontal: 20, marginTop: 24, marginBottom: 14, letterSpacing: -0.3 },
  challengeList:  { paddingLeft: 20, paddingRight: 8, gap: 12 },
  challengeCard:  { width: 140, padding: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, gap: 8 },
  challengeIcon:  { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  challengeTitle: { fontSize: 14, fontWeight: '800' },
  challengeReward:{ fontSize: 12, fontWeight: '700' },
  filtersRow:     { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 20, marginBottom: 4 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  chipText:       { fontSize: 13, fontWeight: '700' },
  roomCard:       { marginHorizontal: 20, marginTop: 14, borderRadius: 24, overflow: 'hidden', height: 200 },
  liveBadge:      { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,46,99,0.9)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
  liveDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText:       { fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  levelBadge:     { position: 'absolute', top: 14, left: 14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  levelText:      { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  roomInfo:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  roomName:       { fontSize: 20, fontWeight: '900', color: '#FFF', marginBottom: 6 },
  roomMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomMetaText:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  dot:            { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 4 },
});
