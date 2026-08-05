import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '../context/ThemeContext';
import { storage } from '../../services/storage';
import { getStorageUrl } from '../../services/api';

interface RowProps {
  icon: string;
  label: string;
  value?: string;
  iconColor?: string;
  onPress?: () => void;
  showDivider?: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { C, isDark, toggle } = useColors();
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);

  useEffect(() => {
    storage.get('user').then(raw => {
      if (raw) {
        try { setUser(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  // Color theme according to spec: pure black or pure white background with cyber offsets
  const theme = {
    bg: isDark ? '#000000' : '#ffffff',
    surface: isDark ? '#131313' : '#f9f9f9',
    card: isDark ? '#1b1b1b' : '#f9f9f9',
    cardElevated: isDark ? '#2a2a2a' : '#eeeeee',
    border: isDark ? '#353535' : '#eeeeee',
    textPrimary: isDark ? '#e2e2e2' : '#1a1c1c',
    textMuted: isDark ? '#a1a1aa' : '#5c3f42',
    accent: '#ff2e63', // Neon Pink color spec
  };

  const Row = ({ icon, label, value, iconColor = theme.accent, onPress, showDivider }: RowProps) => (
    <View style={s.rowWrapper}>
      <TouchableOpacity 
        style={s.row} 
        onPress={onPress} 
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={s.rowLeft}>
          <View style={[s.rowIcon, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
          </View>
          <Text style={[s.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
        </View>

        <View style={s.rowRight}>
          {value && <Text style={[s.rowValue, { color: theme.textMuted }]}>{value}</Text>}
          {onPress && (
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color={theme.accent} 
              style={s.chevron}
            />
          )}
        </View>
      </TouchableOpacity>
      {showDivider && <View style={[s.divider, { backgroundColor: theme.border }]} />}
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Header aligned perfectly with design spec */}
      <View style={[s.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <SafeAreaView style={s.headerContainer}>
          <View style={s.headerInnerRow}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[s.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            
            <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Ajustes</Text>
            
            <View style={s.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        
        {/* Profile Card */}
        <TouchableOpacity 
          style={[s.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
          onPress={() => navigation.navigate('screens/EditProfileScreen')} 
          activeOpacity={0.8}
        >
          <View style={s.profileLeft}>
            <View style={[s.profileAvatarContainer, { borderColor: theme.border }]}>
              {user?.avatar ? (
                <Image source={{ uri: getStorageUrl(user.avatar) ?? undefined }} style={s.profileAvatar} />
              ) : (
                <View style={[s.profileAvatar, { backgroundColor: theme.cardElevated, alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialCommunityIcons name="account" size={28} color={theme.textMuted} />
                </View>
              )}
            </View>
            <View style={s.profileInfo}>
              <Text style={[s.profileName, { color: theme.textPrimary }]}>{user?.name ?? '...'}</Text>
              <Text style={[s.profileSub, { color: theme.textMuted }]}>{user?.email ?? ''}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.accent} />
        </TouchableOpacity>

        {/* APARIENCIA Group */}
        <Text style={[s.groupLabel, { color: theme.textMuted }]}>APARIENCIA</Text>
        <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity 
            style={s.row} 
            onPress={toggle} 
            activeOpacity={0.7}
          >
            <View style={s.rowLeft}>
              <View style={[s.rowIcon, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons 
                  name={isDark ? 'weather-night' : 'weather-sunny'} 
                  size={18} 
                  color={theme.accent} 
                />
              </View>
              <Text style={[s.rowLabel, { color: theme.textPrimary }]}>Modo Oscuro</Text>
            </View>

            <View style={[s.toggleContainer, { backgroundColor: isDark ? theme.accent : theme.border }]}>
              <View style={[s.toggleKnob, { transform: [{ translateX: isDark ? 16 : 0 }] }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* PERFIL Group */}
        <Text style={[s.groupLabel, { color: theme.textMuted }]}>PERFIL</Text>
        <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Row 
            icon="account-edit-outline" 
            label="Editar Perfil" 
            onPress={() => navigation.navigate('screens/EditProfileScreen')} 
            showDivider={true}
          />
          <Row 
            icon="shield-check-outline" 
            label="Cuenta y Seguridad" 
            onPress={() => navigation.navigate('screens/SecurityScreen')} 
          />
        </View>

        {/* PREFERENCIAS Group */}
        <Text style={[s.groupLabel, { color: theme.textMuted }]}>PREFERENCIAS</Text>
        <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Row 
            icon="bell-ring-outline" 
            label="Notificaciones" 
            onPress={() => {}} 
            showDivider={true}
          />
          <Row 
            icon="translate" 
            label="Idioma" 
            value="Español" 
            onPress={() => {}}
          />
        </View>

        {/* SOPORTE Group */}
        <Text style={[s.groupLabel, { color: theme.textMuted }]}>SOPORTE</Text>
        <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Row 
            icon="help-circle-outline" 
            label="Centro de Ayuda" 
            onPress={() => {}} 
            showDivider={true}
          />
          <Row 
            icon="file-document-outline" 
            label="Términos y Privacidad" 
            onPress={() => {}} 
          />
        </View>

        {/* Footer Version */}
        <Text style={[s.versionText, { color: theme.textMuted }]}>MUGEN v1.0.0</Text>
        <View style={s.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { 
    flex: 1, 
  },
  header: { 
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerContainer: {
    width: '100%',
  },
  headerInnerRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1,
  },
  headerTitle: { 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
    fontSize: 20, 
    fontWeight: '900',
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -30 }], // Simple centered effect
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: { 
    paddingTop: 8,
    paddingBottom: 40,
  },
  profileCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginHorizontal: 16, 
    marginTop: 16, 
    marginBottom: 24, 
    padding: 16, 
    borderRadius: 12, 
    borderWidth: 1,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatarContainer: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileAvatar: { 
    width: '100%', 
    height: '100%', 
  },
  profileInfo: { 
    justifyContent: 'center',
  },
  profileName: { 
    fontSize: 18, 
    fontWeight: '800', 
    letterSpacing: -0.3,
  },
  profileSub: { 
    fontSize: 12, 
    fontWeight: '600',
    marginTop: 2,
  },
  groupLabel: { 
    fontSize: 11, 
    fontWeight: '800', 
    letterSpacing: 1.5, 
    marginHorizontal: 20, 
    marginTop: 16, 
    marginBottom: 8, 
  },
  group: { 
    marginHorizontal: 16, 
    borderRadius: 12, 
    overflow: 'hidden', 
    borderWidth: 1, 
    marginBottom: 8,
  },
  rowWrapper: {
    width: '100%',
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 14, 
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  rowLabel: { 
    fontSize: 14, 
    fontWeight: '700', 
  },
  rowRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
  },
  rowValue: { 
    fontSize: 13, 
    fontWeight: '600', 
  },
  chevron: {
    marginLeft: 4,
  },
  toggleContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  divider: { 
    height: 1, 
    marginLeft: 64, // aligns nicely past icon
    marginRight: 16,
  },
  versionText: { 
    textAlign: 'center', 
    marginTop: 36, 
    fontSize: 11, 
    fontWeight: '800', 
    letterSpacing: 2, 
    textTransform: 'uppercase',
  },
  bottomSpacer: {
    height: 120,
  },
});
