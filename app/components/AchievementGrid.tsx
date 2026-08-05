import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';

const ACHIEVEMENTS = [
  { icon: '🏆', label: 'Primer reto', unlocked: true },
  { icon: '🔥', label: 'Racha 7d', unlocked: true },
  { icon: '⚡', label: '100 sessions', unlocked: false },
  { icon: '🥊', label: 'Boxeador', unlocked: true },
  { icon: '🏅', label: 'Top 10', unlocked: false },
  { icon: '💪', label: 'Élite', unlocked: false },
];

const AchievementGrid = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logros</Text>
      <View style={styles.grid}>
        {ACHIEVEMENTS.map((a) => (
          <View key={a.label} style={[styles.badge, !a.unlocked && styles.locked]}>
            <Text style={styles.icon}>{a.icon}</Text>
            <Text style={styles.label}>{a.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.mugenPink + '15',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.mugenPink + '40',
    gap: 6,
  },
  locked: {
    opacity: 0.3,
    borderColor: COLORS.slateGray + '40',
    backgroundColor: 'rgba(148,163,184,0.05)',
  },
  icon: {
    fontSize: 28,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.slateGray,
    textAlign: 'center',
  },
});

export default AchievementGrid;
