import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACCENT = '#FF0066';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CrearSalaModal({ visible, onClose }: Props) {
  const router = useRouter();

  const handleCrear = () => {
    onClose();
    router.push('/screens/CreateChallengeScreen' as any);
  };

  const handleUnirse = () => {
    onClose();
    router.push('/screens/JoinChallengeScreen' as any);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>¿Qué quieres hacer?</Text>

          <TouchableOpacity style={s.option} onPress={handleCrear} activeOpacity={0.8}>
            <View style={[s.iconWrap, { backgroundColor: ACCENT + '15' }]}>
              <Ionicons name="add-circle-outline" size={24} color={ACCENT} />
            </View>
            <View style={s.optionText}>
              <Text style={s.optionTitle}>Crear una sala</Text>
              <Text style={s.optionDesc}>Crea tu desafío y invita a tus amigos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.option} onPress={handleUnirse} activeOpacity={0.8}>
            <View style={[s.iconWrap, { backgroundColor: '#0a0a0a15' }]}>
              <Ionicons name="enter-outline" size={24} color="#0a0a0a" />
            </View>
            <View style={s.optionText}>
              <Text style={s.optionTitle}>Unirse a una sala</Text>
              <Text style={s.optionDesc}>Ingresa un código o escanea el QR</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:      { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:       { fontSize: 18, fontWeight: '800', color: '#0a0a0a', marginBottom: 20, textAlign: 'center' },
  option:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  iconWrap:    { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionText:  { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#0a0a0a', marginBottom: 2 },
  optionDesc:  { fontSize: 12, color: '#888' },
  divider:     { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },
  cancelBtn:   { marginTop: 20, alignItems: 'center', padding: 14 },
  cancelText:  { fontSize: 15, fontWeight: '600', color: '#888' },
});
