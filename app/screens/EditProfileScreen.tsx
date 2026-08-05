import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '../context/ThemeContext';
import { getStorageUrl, userApi } from '../../services/api';
import { storage } from '../../services/storage';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { C, isDark } = useColors();

  const theme = {
    bg:               isDark ? '#000000' : '#f9f9f9',
    surface:          isDark ? '#131313' : '#ffffff',
    card:             isDark ? '#1f1f1f' : '#ffffff',
    border:           isDark ? '#2a2a2a' : '#e2e2e2',
    textPrimary:      isDark ? '#e2e2e2' : '#1a1c1c',
    textSecondary:    isDark ? '#e5bdc0' : '#5c3f42',
    textMuted:        isDark ? '#ac888a' : '#906e71',
    elevated:         isDark ? '#1b1b1b' : '#f3f3f4',
    primary:          '#FF2E63',
    primaryContainer: isDark ? '#ff4f72' : '#e51152',
  };

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    bio:      '',
    weight:   '',
    height:   '',
  });
  const [avatarUri, setAvatarUri]           = useState<string | null>(null);
  const [avatarMimeType, setAvatarMimeType] = useState<string>('image/jpeg');
  const [token, setToken]                   = useState('');
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [focused, setFocused]               = useState<string | null>(null);

  // Ref para saber si el usuario YA eligió una foto nueva en esta sesión.
  // Evita que la respuesta de la API sobreescriba el URI local (race condition).
  const userPickedPhoto = useRef(false);

  useEffect(() => {
    (async () => {
      const [t, userRaw, localAvatar, localMime] = await Promise.all([
        storage.get('token'),
        storage.get('user'),
        storage.get('avatar_local'),
        storage.get('avatar_mime'),
      ]);
      if (t) setToken(t);

      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          setForm({
            fullName: u.name      ?? '',
            username: u.username  ?? '',
            bio:      u.bio       ?? '',
            weight:   u.weight    ? String(u.weight) : '',
            height:   u.height    ? String(u.height) : '',
          });
          // Prioridad: avatar elegido localmente > URL del servidor
          if (localAvatar) {
            setAvatarUri(localAvatar);
            if (localMime) setAvatarMimeType(localMime);
          } else {
            const savedAvatar = getStorageUrl(u.avatar);
            if (savedAvatar) setAvatarUri(savedAvatar);
          }
        } catch (_) {}
      }

      // Actualizar desde API (mejor esfuerzo)
      if (t) {
        try {
          const res = await userApi.me(t);
          const u   = res.data;
          setForm({
            fullName: u.name      ?? '',
            username: u.username  ?? '',
            bio:      u.bio       ?? '',
            weight:   u.weight    ? String(u.weight) : '',
            height:   u.height    ? String(u.height) : '',
          });
          await storage.set('user', JSON.stringify(u));
          // Solo usar avatar del servidor si el usuario NO eligió una foto nueva
          // (evita race condition: API puede llegar DESPUÉS de que el usuario pickea)
          if (!userPickedPhoto.current) {
            const freshAvatar = getStorageUrl(u.avatar);
            if (freshAvatar) setAvatarUri(freshAvatar);
          }
        } catch (_) {
          // Sin conexión — usamos datos locales
        }
      }

      setLoading(false);
    })();
  }, []);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri   = asset.uri;
      const mime  = asset.mimeType ?? 'image/jpeg';

      console.log('[PICK] ✅ foto seleccionada');
      console.log('[PICK] uri:', uri);
      console.log('[PICK] mime:', mime);
      console.log('[PICK] width:', asset.width, 'height:', asset.height);

      // Marcar que el usuario eligió una foto → evita que la API sobreescriba el estado
      userPickedPhoto.current = true;

      setAvatarMimeType(mime);
      setAvatarUri(uri);

      await storage.set('avatar_local', uri);
      await storage.set('avatar_mime', mime);
    } else {
      console.log('[PICK] cancelado o sin asset');
    }
  };

  const isLocalUri = (uri: string) =>
    uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');

  const save = async () => {
    // ── Diagnóstico: estado al momento de guardar ──────────────────────────
    console.log('[SAVE] avatarUri actual:', avatarUri);
    console.log('[SAVE] avatarMimeType:', avatarMimeType);
    console.log('[SAVE] userPickedPhoto:', userPickedPhoto.current);
    console.log('[SAVE] isLocalUri:', avatarUri ? isLocalUri(avatarUri) : 'N/A (null)');
    // ────────────────────────────────────────────────────────────────────────

    if (!form.fullName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }

    setSaving(true);
    try {
      // ─── 1. GUARDAR LOCALMENTE PRIMERO ─────────────────────────────────────
      const userRaw = await storage.get('user');
      let currentUser: any = {};
      try { currentUser = JSON.parse(userRaw ?? '{}'); } catch (_) {}

      const localUpdate = {
        ...currentUser,
        name:     form.fullName.trim(),
        username: form.username.trim(),
        bio:      form.bio.trim(),
        weight:   form.weight ? Number(form.weight) : currentUser.weight,
        height:   form.height ? Number(form.height) : currentUser.height,
      };
      await storage.set('user', JSON.stringify(localUpdate));

      // El avatar local ya se guardó en pickAvatar, pero por si acaso:
      if (avatarUri && isLocalUri(avatarUri)) {
        await storage.set('avatar_local', avatarUri);
      }

      // ─── 2. SINCRONIZAR CON SERVIDOR ──────────────────────────────────────
      if (token) {
        try {
          const data = new FormData();
          data.append('name',     form.fullName.trim());
          data.append('username', form.username.trim());
          data.append('bio',      form.bio.trim());
          if (form.weight) data.append('weight', form.weight);
          if (form.height) data.append('height', form.height);

          if (avatarUri && isLocalUri(avatarUri)) {
            // Nombre de archivo: priorizar extensión que coincida con el MIME
            const mimeToUse = avatarMimeType || 'image/jpeg';
            // Siempre subir como jpeg (Expo convierte HEIC → JPEG con allowsEditing)
            const finalMime = mimeToUse.includes('heic') || mimeToUse.includes('heif')
              ? 'image/jpeg'
              : mimeToUse;
            const ext      = finalMime.split('/')[1] ?? 'jpg';
            const fileName = `avatar_${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;

            console.log('[UPLOAD] uri:', avatarUri);
            console.log('[UPLOAD] fileName:', fileName, '| mime:', finalMime);

            // ✅ FIX CRÍTICO: NO quitar "file://" — React Native necesita el esquema
            //    completo (file:// o content://) para leer el archivo y adjuntarlo.
            //    Quitarlo produce una ruta POSIX inválida que fetch descarta silenciosamente.
            data.append('avatar', {
              uri:  avatarUri,
              name: fileName,
              type: finalMime,
            } as any);
          }

          console.log('[UPLOAD] enviando al servidor...');
          const res        = await userApi.updateProfile(data, token);
          const serverUser = res.data?.user ?? res.data;
          console.log('[UPLOAD] respuesta servidor:', JSON.stringify(serverUser).slice(0, 200));

          if (serverUser && typeof serverUser === 'object') {
            await storage.set('user', JSON.stringify(serverUser));
            // El servidor guardó el avatar → limpiar copia local
            if (serverUser.avatar) {
              await storage.remove('avatar_local');
              await storage.remove('avatar_mime');
              console.log('[UPLOAD] avatar guardado en servidor:', serverUser.avatar);
            }
          }
        } catch (serverErr: any) {
          console.log('[UPLOAD] server sync failed:', serverErr?.message);
          console.log('[UPLOAD] respuesta:', JSON.stringify(serverErr?.response?.data));
          // Datos locales ya guardados — no bloqueamos al usuario
        }
      }

      Alert.alert('¡Listo!', 'Perfil actualizado correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.log('[SAVE] error:', err);
      Alert.alert('Error', 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const InputField = ({
    label, field, placeholder, extra = {} as any,
  }: { label: string; field: string; placeholder: string; extra?: any }) => (
    <View style={s.inputGroup}>
      <Text style={[s.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          s.input,
          { backgroundColor: theme.card, color: theme.textPrimary, borderColor: focused === field ? theme.primary : theme.border },
          extra.multiline && s.inputMulti,
        ]}
        value={(form as any)[field]}
        onChangeText={v => update(field, v)}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        onFocus={() => setFocused(field)}
        onBlur={() => setFocused(null)}
        {...extra}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <View style={[s.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <SafeAreaView style={s.headerContainer}>
          <View style={s.headerInnerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[s.closeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: theme.textPrimary }]}>Editar Perfil</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.keyboardView}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Avatar */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={s.avatarTouchable}>
              <View style={[s.avatarRing, { borderColor: theme.primaryContainer, shadowColor: theme.primaryContainer }]}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={s.avatar}
                    onError={() => setAvatarUri(null)}
                  />
                ) : (
                  <View style={[s.avatarPlaceholder, { backgroundColor: theme.elevated }]}>
                    <MaterialCommunityIcons name="account" size={44} color={theme.primary} />
                  </View>
                )}
              </View>
              <View style={[s.cameraBtn, { backgroundColor: theme.primaryContainer, borderColor: theme.surface }]}>
                <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7}>
              <Text style={[s.changePhoto, { color: theme.primaryContainer }]}>Cambiar foto</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={s.form}>
            <InputField label="Nombre completo"    field="fullName" placeholder="Tu nombre" />
            <InputField label="Nombre de usuario"  field="username" placeholder="@usuario" extra={{ autoCapitalize: 'none' }} />
            <InputField
              label="Biografía"
              field="bio"
              placeholder="Cuéntanos algo..."
              extra={{ multiline: true, numberOfLines: 3, textAlignVertical: 'top' }}
            />
            <View style={s.metricsRow}>
              <View style={{ flex: 1 }}>
                <InputField label="Peso (kg)" field="weight" placeholder="00" extra={{ keyboardType: 'numeric' }} />
              </View>
              <View style={{ width: 14 }} />
              <View style={{ flex: 1 }}>
                <InputField label="Altura (cm)" field="height" placeholder="000" extra={{ keyboardType: 'numeric' }} />
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save button */}
      <View style={[s.footer, { backgroundColor: theme.bg }]}>
        <LinearGradient
          colors={isDark
            ? ['transparent', 'rgba(19,19,19,0.95)', '#131313']
            : ['transparent', 'rgba(249,249,249,0.95)', '#f9f9f9']}
          style={s.footerGradient}
        />
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: theme.primaryContainer, shadowColor: theme.primaryContainer }, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={s.saveBtnContent}>
              <Text style={s.saveBtnText}>GUARDAR CAMBIOS</Text>
              <MaterialCommunityIcons name="check" size={18} color="#FFF" style={s.buttonCheckIcon} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1 },
  header:         { borderBottomWidth: 1, zIndex: 10 },
  headerContainer:{ width: '100%' },
  headerInnerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn:       { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitle:    { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  keyboardView:   { flex: 1 },
  scroll:         { paddingHorizontal: 20, paddingTop: 10 },
  avatarSection:  { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  avatarTouchable:{ position: 'relative' },
  avatarRing:     { width: 108, height: 108, borderRadius: 54, borderWidth: 3, justifyContent: 'center', alignItems: 'center', padding: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  avatar:         { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  cameraBtn:      { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 4 },
  changePhoto:    { fontWeight: '800', fontSize: 13, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  form:           { gap: 20 },
  inputGroup:     { gap: 8 },
  label:          { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginLeft: 4 },
  input:          { height: 52, borderRadius: 16, paddingHorizontal: 16, fontSize: 15, fontWeight: '600', borderWidth: 1.5 },
  inputMulti:     { height: 96, paddingTop: 14 },
  metricsRow:     { flexDirection: 'row' },
  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  footerGradient: { position: 'absolute', top: -24, left: 0, right: 0, height: 24 },
  saveBtn:        { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  saveBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  saveBtnText:    { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  buttonCheckIcon:{ marginLeft: 6 },
});
