import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';

interface Props {
  days: number;
}

const MugenStreakCard = ({ days }: Props) => {
  return (
    <View style={styles.card}>
      <Text style={styles.fireEmoji}>🔥</Text>
      <View>
        <Text style={styles.daysText}>{days} días</Text>
        <Text style={styles.label}>Racha actual</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mugenPink + '15',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    gap: 16,
    borderWidth: 1.5,
    borderColor: COLORS.mugenPink + '40',
  },
  fireEmoji: {
    fontSize: 40,
  },
  daysText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.mugenPink,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slateGray,
    marginTop: 2,
  },
});

export default MugenStreakCard;
