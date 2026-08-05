import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';

interface Props {
  name: string;
  rank: string;
  level: number;
  xpProgress: number;
  avatarUri?: string | null;
  onEditPress: () => void;
}

const ProfileHeader = ({ name, rank, level, xpProgress, avatarUri, onEditPress }: Props) => {
  const { C } = useColors();

  return (
    <View style={[styles.container, { backgroundColor: C.card }]}>
      <View style={styles.avatarWrapper}>
        <View style={[styles.avatarRing, { borderColor: C.mugenPink + '55' }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: C.card }]} />
          ) : (
            <View style={[styles.avatar, { borderColor: C.card, backgroundColor: C.elevated }]}>
              <Ionicons name="person" size={36} color={C.mugenPink} />
            </View>
          )}
        </View>
        <TouchableOpacity style={[styles.editButton, { borderColor: C.mugenPink }]} onPress={onEditPress}>
          <Text style={[styles.editText, { color: C.mugenPink }]}>Editar</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.name, { color: C.textPrimary }]}>{name}</Text>
      <Text style={[styles.rank, { color: C.textSecondary }]}>{rank} · Nivel {level}</Text>

      <View style={[styles.xpBar, { backgroundColor: C.elevated }]}>
        <LinearGradient
          colors={[C.mugenPink, '#FF6B35']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.xpFill, { width: `${Math.min(100, xpProgress * 100)}%` }]}
        />
      </View>
      <Text style={[styles.xpLabel, { color: C.textSecondary }]}>{Math.round(xpProgress * 100)}% al siguiente nivel</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container:     { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  avatarWrapper: { alignItems: 'center', marginBottom: 16 },
  avatarRing:    { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatar:        { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  editButton:    { marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  editText:      { fontSize: 13, fontWeight: '700' },
  name:          { fontSize: 24, fontWeight: '900' },
  rank:          { fontSize: 14, marginTop: 4, marginBottom: 16 },
  xpBar:         { width: '80%', height: 6, borderRadius: 3, overflow: 'hidden' },
  xpFill:        { height: '100%', borderRadius: 3 },
  xpLabel:       { fontSize: 12, marginTop: 6 },
});

export default ProfileHeader;
