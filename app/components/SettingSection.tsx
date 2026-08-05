import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../context/ThemeContext';

interface Props { title: string; children: React.ReactNode }

const SettingSection = ({ title, children }: Props) => {
  const { C } = useColors();
  return (
    <View style={s.section}>
      <Text style={[s.title, { color: C.textMuted }]}>{title.toUpperCase()}</Text>
      <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {children}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  section: { marginBottom: 24, paddingHorizontal: 16 },
  title:   { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  card:    { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
});

export default SettingSection;
