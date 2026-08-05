import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../context/ThemeContext';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const today = new Date().getDay();
const TODAY_INDEX = today === 0 ? 6 : today - 1;

export default function MugenTopCalendar() {
  const { C } = useColors();
  return (
    <View style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {DAYS.map((day, i) => {
          const isToday = i === TODAY_INDEX;
          return (
            <TouchableOpacity key={day} style={s.dayWrapper} activeOpacity={0.7}>
              <Text style={[s.dayName, { color: isToday ? C.mugenPink : C.textMuted }]}>{day}</Text>
              <View style={[s.circle, { backgroundColor: isToday ? 'transparent' : C.elevated, borderColor: isToday ? C.mugenPink : 'transparent' }]}>
                {isToday && <LinearGradient colors={[C.mugenPink, C.mugenPinkDark]} style={StyleSheet.absoluteFill} borderRadius={20} />}
                <Text style={[s.dayNum, { color: isToday ? '#FFF' : C.textSecondary }]}>{14 + i}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingVertical: 12, paddingHorizontal: 16 },
  row:       { gap: 12 },
  dayWrapper:{ alignItems: 'center', gap: 6 },
  dayName:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  circle:    { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1 },
  dayNum:    { fontSize: 14, fontWeight: '600', zIndex: 1 },
});
