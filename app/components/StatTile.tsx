import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/theme';

interface Props {
  label: string;
  value: string;
  icon: string;
}

const StatTile = ({ label, value, icon }: Props) => {
  return (
    <View style={styles.tile}>
      <MaterialCommunityIcons name={icon as any} size={24} color={COLORS.mugenPink} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.mugenPink + '10',
    gap: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.mugenPink,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.slateGray,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default StatTile;
