import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  Switch, StatusBar, Platform, Alert, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useColors } from '../context/ThemeContext';
import { storage } from '../../services/storage';
import { userApi } from '../../services/api';

interface RowProps {
  icon: string; label: string; subtitle?: string; value?: string;
  iconColor?: string; isSwitch?: boolean; switchVal?: boolean;
  onSwitch?: (v: boolean) => void; onPress?: () => void;
}

export default function SecurityScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { C } = useColors();
  const [isPrivate, setIsPrivate] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Change password modal state
  const [showPwdModal, setShowPwdModal]   = useState(false);
  const [currentPwd,   setCurrentPwd]     = useState('');
  const [newPwd,       setNewPwd]         = useState('');
  const [confirmPwd,   setConfirmPwd]     = useState('');
  const [changingPwd,  setChangingPwd]    = useState(false);
  const [showCurrent,  setShowCurrent]    = useState(false);
  const [showNew,      setShowNew]        = useState(false);

  useEffect(() => {
    storage.get('user').then(raw => {
      if (raw) try { setUserEmail(JSON.parse(raw).email ?? ''); } catch {}
    });
  }, []);

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Error', 'Completa todos los campos.'); return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden.'); return;
    }
    if (newPwd.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres.'); return;
    }
    setChangingPwd(true);
    try {
      const token = await storage.get('token') ?? '';
      await userApi.changePassword(currentPwd, newPwd, token);
      Alert.alert('¡Listo!', 'Contraseña actualizada correctamente.');
      setShowPwdModal(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo cambiar la contraseña.');
    } finally {
      setChangingPwd(false);
    }
  };

  const confirmLogout = (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(window.confirm('¿Estás seguro que deseas cerrar sesión?'));
    }
    return new Promise((resolve) => {
      Alert.alert('Cerrar sesión', '¿Estás seguro?', [
        { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
        { text: 'Salir', onPress: () => resolve(true), style: 'destructive' },
      ]);
    });
  };

  const handleLogout = async () => {
    console.log('[Logout] Botón presionado');
    const confirmed = await confirmLogout();
    if (!confirmed) return;
    console.log('[Logout] Alert confirmado');
    setLoggingOut(true);
    try {
      const token = await storage.get('token');
      console.log('[Logout] Token:', token);

      await storage.remove('token');
      await storage.remove('user');

      const check = await storage.get('token');
      console.log('[Logout] Token después de borrar:', check);

      setLoggingOut(false);
      console.log('[Logout] Navegando...');
      router.replace('/onboarding');
    } catch (e) {
      console.error('[Logout] Error:', e);
    }
  };

  const Row = ({ icon, label, subtitle, value, iconColor = C.mugenPink, isSwitch, switchVal, onSwitch, onPress }: RowProps) => (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[s.rowIcon, { backgroundColor: iconColor + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={s.rowText}>
        <Text style={[s.rowLabel, { color: C.textPrimary }]}>{label}</Text>
        {subtitle && <Text style={[s.rowSub, { color: C.textSecondary }]}>{subtitle}</Text>}
      </View>
      {isSwitch
        ? <Switch value={switchVal} onValueChange={onSwitch} trackColor={{ true: C.mugenPink, false: C.elevated }} thumbColor="#FFF" />
        : value ? <Text style={[s.rowValue, { color: C.textSecondary }]}>{value}</Text>
        : onPress ? <MaterialCommunityIcons name="chevron-right" size={18} color={C.textMuted} /> : null
      }
    </TouchableOpacity>
  );

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />

      <View style={[s.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 52, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: C.card, borderColor: C.border }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Cuenta y Seguridad</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Modal cambiar contraseña ── */}
      <Modal visible={showPwdModal} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={() => setShowPwdModal(false)} />
          <View style={[s.pwdSheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.pwdTitle, { color: C.textPrimary }]}>Cambiar contraseña</Text>

            {[
              { label: 'Contraseña actual', val: currentPwd, set: setCurrentPwd, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { label: 'Nueva contraseña',  val: newPwd,     set: setNewPwd,     show: showNew,     toggle: () => setShowNew(v => !v) },
              { label: 'Confirmar nueva',   val: confirmPwd, set: setConfirmPwd, show: showNew,     toggle: () => setShowNew(v => !v) },
            ].map(({ label, val, set, show, toggle }) => (
              <View key={label} style={[s.pwdField, { borderColor: C.border, backgroundColor: C.bg }]}>
                <TextInput
                  style={[s.pwdInput, { color: C.textPrimary }]}
                  placeholder={label}
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!show}
                  value={val}
                  onChangeText={set}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={toggle} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name={show ? 'eye-off' : 'eye'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[s.pwdBtn, changingPwd && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={changingPwd}
            >
              {changingPwd
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.pwdBtnTxt}>Actualizar contraseña</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <Text style={[s.groupLabel, { color: C.textMuted }]}>CREDENCIALES</Text>
        <View style={[s.group, { backgroundColor: C.card, borderColor: C.border }]}>
          <Row icon="email-outline" label="Correo electrónico" value={userEmail} iconColor={C.cyan} />
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <Row icon="lock-reset" label="Cambiar contraseña" iconColor={C.purple} onPress={() => setShowPwdModal(true)} />
        </View>

        <Text style={[s.groupLabel, { color: C.textMuted }]}>PRIVACIDAD</Text>
        <View style={[s.group, { backgroundColor: C.card, borderColor: C.border }]}>
          <Row icon="eye-off-outline" label="Cuenta Privada" subtitle="Solo seguidores aprobados verán tu perfil" iconColor={C.gold} isSwitch switchVal={isPrivate} onSwitch={setIsPrivate} />
        </View>

        <Text style={[s.groupLabel, { color: C.textMuted }]}>SEGURIDAD ADICIONAL</Text>
        <View style={[s.group, { backgroundColor: C.card, borderColor: C.border }]}>
          <Row icon="shield-check-outline" label="Autenticación 2FA" iconColor={C.success} isSwitch switchVal={twoFactor} onSwitch={setTwoFactor} />
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <Row icon="cellphone-link" label="Dispositivos vinculados" onPress={() => {}} />
        </View>

        <Text style={[s.groupLabel, { color: '#EF4444AA' }]}>ZONA DE PELIGRO</Text>
        <View style={[s.group, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={handleLogout} disabled={loggingOut}>
            <View style={[s.rowIcon, { backgroundColor: '#EF444420' }]}>
              <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            </View>
            <Text style={[s.rowLabel, { color: '#EF4444', flex: 1 }]}>Cerrar sesión</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#EF444460" />
          </TouchableOpacity>
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => Alert.alert('Eliminar cuenta', 'Esta acción es irreversible.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive' }])}>
            <View style={[s.rowIcon, { backgroundColor: '#EF444420' }]}>
              <MaterialCommunityIcons name="account-remove" size={18} color="#EF4444" />
            </View>
            <Text style={[s.rowLabel, { color: '#EF444475', flex: 1 }]}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn:     { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  scroll:      { paddingBottom: 20 },
  groupLabel:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginHorizontal: 20, marginTop: 24, marginBottom: 8 },
  group:       { marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  row:         { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowIcon:     { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowText:     { flex: 1 },
  rowLabel:    { fontSize: 15, fontWeight: '600' },
  rowSub:      { fontSize: 11, marginTop: 2, lineHeight: 15 },
  rowValue:    { fontSize: 13, fontWeight: '600' },
  divider:     { height: 1, marginHorizontal: 16 },
  pwdSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, gap: 12 },
  pwdTitle:    { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  pwdField:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  pwdInput:    { flex: 1, fontSize: 15, paddingVertical: 12 },
  pwdBtn:      { backgroundColor: '#E8285A', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  pwdBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 15 },
});
