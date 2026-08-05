import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';

interface Props {
  seconds: number;
  totalSeconds: number;
}

const TimerDisplay = ({ seconds, totalSeconds }: Props) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const progress = totalSeconds > 0 ? seconds / totalSeconds : 0;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>
        {pad(hrs)}:{pad(mins)}:{pad(secs)}
      </Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  timer: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.mugenPink,
    borderRadius: 3,
  },
});

export default TimerDisplay;
