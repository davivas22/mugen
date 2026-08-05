import React, { useReducer, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, TouchableOpacity, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../context/ThemeContext';

type Status = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';
type State = { status: Status; seconds: number };
type Action = { type: 'START_PAUSE' } | { type: 'TICK' } | { type: 'STOP' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_PAUSE':
      return { ...state, status: state.status === 'RUNNING' ? 'PAUSED' : 'RUNNING' };
    case 'TICK':
      return state.status === 'RUNNING' ? { ...state, seconds: state.seconds + 1 } : state;
    case 'STOP':
      return { ...state, status: 'FINISHED' };
    default:
      return state;
  }
}

const METRICS = [
  { label: 'BPM', value: '142', icon: 'heart-pulse', color: '#FF6B35' },
  { label: 'Calorías', value: '320', icon: 'fire', color: '#FF2E63' },
  { label: 'Distancia', value: '2.4km', icon: 'map-marker-distance', color: '#00F5FF' },
];

const pad = (n: number) => String(n).padStart(2, '0');

const LiveSessionScreen = () => {
  const navigation = useNavigation<any>();
  const { C } = useColors();
  const [state, dispatch] = useReducer(reducer, { status: 'IDLE', seconds: 0 });

  useEffect(() => {
    if (state.status !== 'RUNNING') return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'FINISHED') navigation.goBack();
  }, [state.status]);

  const hrs = Math.floor(state.seconds / 3600);
  const mins = Math.floor((state.seconds % 3600) / 60);
  const secs = state.seconds % 60;

  const isRunning = state.status === 'RUNNING';
  const hasStarted = state.status !== 'IDLE';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#000000', '#0D000A', '#080810']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[C.mugenPink + '15', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: '50%' }]}
      />

      <SafeAreaView style={styles.container}>

        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={22} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={styles.sessionBadge}>
            {isRunning && <View style={styles.livePulse} />}
            <Text style={styles.sessionBadgeText}>{isRunning ? 'EN SESIÓN' : hasStarted ? 'PAUSADO' : 'LISTO'}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* METRICS */}
        <View style={styles.metricsRow}>
          {METRICS.map(m => (
            <View key={m.label} style={styles.metricCard}>
              <MaterialCommunityIcons name={m.icon as any} size={20} color={m.color} />
              <Text style={[styles.metricVal, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* TIMER */}
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>TIEMPO TRANSCURRIDO</Text>
          <Text style={styles.timerText}>
            {pad(hrs)}:{pad(mins)}:{pad(secs)}
          </Text>
          {/* Progress ring placeholder */}
          <View style={styles.progressBar}>
            <LinearGradient
              colors={[C.mugenPink, '#FF6B35']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min((state.seconds / 3600) * 100, 100)}%` }]}
            />
          </View>
          <Text style={styles.progressLabel}>Meta: 60 min</Text>
        </View>

        {/* CONTROLS */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.secondaryCtrl}
            onPress={() => dispatch({ type: 'STOP' })}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="stop" size={24} color={C.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mainCtrl}
            onPress={() => dispatch({ type: 'START_PAUSE' })}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[C.mugenPink, C.mugenPinkDark]}
              style={StyleSheet.absoluteFill}
              borderRadius={40}
            />
            <MaterialCommunityIcons
              name={isRunning ? 'pause' : 'play'}
              size={36}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryCtrl} activeOpacity={0.8}>
            <MaterialCommunityIcons name="flag-outline" size={24} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF2E63',
  },
  sessionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  metricCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 90,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 76,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 8,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  mainCtrl: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#FF2E63',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  secondaryCtrl: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

export default LiveSessionScreen;
