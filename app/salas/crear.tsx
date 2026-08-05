import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { storage } from '../../services/storage';
import { inviteApi } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PINK = '#E8285A';
const PINK_LIGHT = '#FDE8EE';
const GRAY_100 = '#F7F7F8';
const GRAY_200 = '#EBEBED';
const GRAY_400 = '#AEAEB2';
const GRAY_600 = '#636366';
const GRAY_800 = '#2C2C2E';
const WHITE = '#FFFFFF';

const Icon = ({ name, size = 20, color = '#1a1a1a' }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    close: '✕',
    chevronRight: '›',
    chevronLeft: '‹',
    magnify: '⊙',
    qrcode: '▦',
    users: '⊕',
    calendar: '▦',
    clock: '◷',
  };
  return (
    <Text style={{ fontSize: size, color, lineHeight: size + 4, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }}>
      {icons[name] || '•'}
    </Text>
  );
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BuscarSalaScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    setLoading(true);
    setChallenge(null);
    setSearched(false);
    try {
      const { data } = await inviteApi.findByCode(c);
      setChallenge(data.challenge);
    } catch {
      Alert.alert('No encontrado', 'No existe ninguna sala con ese código.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const join = async () => {
    const token = await storage.get('token');
    const c = code.trim().toUpperCase();
    if (!token) {
      await storage.set('pending_invite_code', c);
      router.replace('/register');
      return;
    }
    setJoining(true);
    try {
      await inviteApi.join(c, token);
      Alert.alert('¡Bienvenido!', `Te uniste a "${challenge.name}"`, [
        { text: 'Ver sala', onPress: () => router.replace('/(tabs)' as any) },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'No se pudo unir. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={14} color={GRAY_800} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Buscar sala</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.stepTitle}>Únete a una sala</Text>
        <Text style={s.stepSubtitle}>Ingresa el código de invitación que te compartieron o escanea el QR.</Text>

        {/* Input */}
        <Text style={s.fieldLabel}>Código de invitación</Text>
        <View style={s.inputRow}>
          <Text style={s.inputHash}>#</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: ABC123"
            placeholderTextColor={GRAY_400}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
            returnKeyType="search"
            onSubmitEditing={search}
          />
          <TouchableOpacity
            onPress={search}
            disabled={loading || code.trim().length < 4}
            style={[s.searchBtn, code.trim().length >= 4 && s.searchBtnActive]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Icon name="magnify" size={18} color={code.trim().length >= 4 ? WHITE : GRAY_400} />
            )}
          </TouchableOpacity>
        </View>

        {/* Result */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={PINK} />
            <Text style={s.loadingText}>Buscando sala...</Text>
          </View>
        ) : challenge ? (
          <View style={s.resultCard}>
            {challenge.cover_image && (
              <Image
                source={{ uri: `http://192.168.1.5:8000/storage/${challenge.cover_image}` }}
                style={s.coverImage}
                resizeMode="cover"
              />
            )}
            <View style={s.resultBody}>
              <Text style={s.challengeName}>{challenge.name}</Text>
              <View style={s.challengeMetaRow}>
                <View style={s.metaItem}>
                  <Icon name="users" size={14} color={PINK} />
                  <Text style={s.metaText}>{challenge.members_count ?? 1} miembros</Text>
                </View>
                <View style={s.metaItem}>
                  <Icon name="clock" size={14} color={PINK} />
                  <Text style={s.metaText}>{challenge.duration_days} días</Text>
                </View>
              </View>
              <View style={s.metaItem}>
                <Icon name="calendar" size={14} color={PINK} />
                <Text style={s.metaText}>Inicia {formatDate(challenge.start_date)}</Text>
              </View>
              {challenge.user && (
                <Text style={s.createdBy}>Creado por {challenge.user.name}</Text>
              )}
            </View>

            <TouchableOpacity
              style={s.joinBtn}
              onPress={join}
              disabled={joining}
              activeOpacity={0.85}
            >
              {joining ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={s.joinBtnText}>UNIRME A LA SALA</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : searched ? (
          <View style={s.emptyBox}>
            <Icon name="users" size={40} color={GRAY_200} />
            <Text style={s.emptyTitle}>No se encontró ninguna sala</Text>
            <Text style={s.emptySub}>Verifica el código e intenta de nuevo</Text>
          </View>
        ) : null}

        {/* Divider */}
        {!challenge && !loading && (
          <>
            <View style={s.divider}>
              <Text style={s.dividerText}>o escanea el QR de tu amigo</Text>
            </View>

            <TouchableOpacity
              style={s.qrBtn}
              onPress={() => router.push('/screens/ScanQRScreen' as any)}
              activeOpacity={0.8}
            >
              <View style={s.qrIconWrap}>
                <Icon name="qrcode" size={24} color={PINK} />
              </View>
              <View style={s.qrTextWrap}>
                <Text style={s.qrBtnTitle}>Escanear código QR</Text>
                <Text style={s.qrBtnDesc}>Usa la cámara para unirte al instante</Text>
              </View>
              <Icon name="chevronRight" size={18} color={GRAY_400} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GRAY_100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_200,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: GRAY_100,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: GRAY_800,
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: GRAY_800,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: GRAY_400,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: GRAY_400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingLeft: 16,
    borderWidth: 1.5,
    borderColor: GRAY_200,
    marginBottom: 24,
  },
  inputHash: {
    fontSize: 20,
    fontWeight: '700',
    color: PINK,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: GRAY_800,
    letterSpacing: 3,
    paddingVertical: 16,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  searchBtnActive: {
    backgroundColor: PINK,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: GRAY_600,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coverImage: {
    width: '100%',
    height: 140,
  },
  resultBody: {
    padding: 20,
  },
  challengeName: {
    fontSize: 20,
    fontWeight: '800',
    color: GRAY_800,
    marginBottom: 12,
  },
  challengeMetaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: GRAY_600,
    fontWeight: '500',
  },
  createdBy: {
    fontSize: 12,
    color: GRAY_400,
    marginTop: 8,
    fontStyle: 'italic',
  },
  joinBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GRAY_600,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: GRAY_400,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    alignItems: 'center',
    paddingTop: 24,
    marginTop: 32,
    marginBottom: 24,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAY_400,
    marginTop: -10,
    paddingHorizontal: 16,
    backgroundColor: GRAY_100,
  },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1.5,
    borderColor: GRAY_200,
  },
  qrIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PINK_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTextWrap: {
    flex: 1,
  },
  qrBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GRAY_800,
    marginBottom: 2,
  },
  qrBtnDesc: {
    fontSize: 12,
    color: GRAY_400,
  },
});
