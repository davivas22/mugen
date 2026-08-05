import { HapticTab } from '@/components/haptic-tab';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { useNavigationState } from '@react-navigation/native';

interface TabIconProps { name: string; focused: boolean }

const TabIcon = ({ name, focused }: TabIconProps) => {
  const { C } = useColors();
  return (
    <View style={[s.iconWrapper, focused && { backgroundColor: C.mugenPink + '22' }]}>
      <MaterialCommunityIcons name={name as any} size={22} color={focused ? C.mugenPink : C.textSecondary} />
      {focused && <View style={[s.dot, { backgroundColor: C.mugenPink }]} />}
    </View>
  );
};

export default function TabLayout() {
  const { C } = useColors();

  const navState = useNavigationState(state => state);

  useEffect(() => {
    console.log('[TABS_LAYOUT] Montado — NAV STACK:', JSON.stringify(navState?.routes?.map((r: any) => r.name), null, 2));
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarActiveTintColor: C.mugenPink,
        tabBarInactiveTintColor: C.textSecondary,
        tabBarLabelStyle: s.label,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20, left: 16, right: 16,
          borderRadius: 28,
          backgroundColor: C.surface,
          borderTopWidth: 0,
          height: 68,
          paddingBottom: Platform.OS === 'ios' ? 8 : 10,
          paddingTop: 8,
          shadowColor: C.mugenPink,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 16,
          borderWidth: 1,
          borderColor: C.border,
        },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <TabIcon name="view-dashboard"  focused={focused} /> }} />
      <Tabs.Screen name="salas"   options={{ title: 'Salas',     tabBarIcon: ({ focused }) => <TabIcon name="account-group"   focused={focused} /> }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking',   tabBarIcon: ({ focused }) => <TabIcon name="trophy"          focused={focused} /> }} />
      <Tabs.Screen name="perfil"  options={{ title: 'Perfil',    tabBarIcon: ({ focused }) => <TabIcon name="account-circle"  focused={focused} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  iconWrapper: { alignItems: 'center', justifyContent: 'center', width: 40, height: 32, borderRadius: 12 },
  dot:         { position: 'absolute', bottom: -6, width: 4, height: 4, borderRadius: 2 },
  label:       { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
