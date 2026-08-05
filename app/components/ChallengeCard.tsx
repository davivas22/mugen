import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/theme';

interface Props {
  title: string;
  reward: string;
  icon: string;
}

const ChallengeCard = ({ title, reward, icon }: Props) => {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={icon as any} size={28} color={COLORS.mugenPink} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.reward}>{reward}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.mugenPink + '10',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: COLORS.mugenPink + '30',
    gap: 8,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.mugenPink + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  reward: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.mugenPink,
  },
});

export default ChallengeCard;
