import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';

const METRICS = [
  { label: 'BPM', value: '142', unit: 'bpm' },
  { label: 'Calorías', value: '320', unit: 'kcal' },
  { label: 'Distancia', value: '2.4', unit: 'km' },
];

const BiometricsRow = () => {
  return (
    <View style={styles.container}>
      {METRICS.map((m) => (
        <View key={m.label} style={styles.tile}>
          <Text style={styles.value}>{m.value}</Text>
          <Text style={styles.unit}>{m.unit}</Text>
          <Text style={styles.label}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  tile: {
    alignItems: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
  },
  unit: {
    fontSize: 14,
    color: COLORS.mugenPink,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
});

export default BiometricsRow;
