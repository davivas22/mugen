import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';

interface Props {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';
  onToggle: () => void;
  onStop: () => void;
}

const SessionControls = ({ status, onToggle, onStop }: Props) => {
  const isRunning = status === 'RUNNING';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.stopButton} onPress={onStop} activeOpacity={0.8}>
        <Text style={styles.stopText}>DETENER</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.mainButton} onPress={onToggle} activeOpacity={0.8}>
        <Text style={styles.mainText}>
          {status === 'IDLE' ? 'INICIAR' : isRunning ? 'PAUSAR' : 'REANUDAR'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  mainButton: {
    flex: 1,
    height: 64,
    backgroundColor: COLORS.mugenPink,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stopButton: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default SessionControls;
