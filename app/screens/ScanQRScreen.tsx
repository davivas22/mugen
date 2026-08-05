import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ScanQRScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={s.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.root}>
        <Text style={s.permText}>Se necesita acceso a la cámara para escanear el QR.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Dar permiso</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // El QR contiene el código directamente
    const code = data.replace('MUGEN-', '').trim();
    router.replace({ pathname: '/screens/JoinChallengeScreen', params: { code } } as any);
  };

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={s.frame} />

        <Text style={s.hint}>Apunta al código QR de la sala</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000' },
  overlay:     { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  closeBtn:    { position: 'absolute', top: 56, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  frame: {
    width: 240, height: 240,
    borderWidth: 3, borderColor: '#FF2E63', borderRadius: 20,
    backgroundColor: 'transparent',
  },
  hint:        { position: 'absolute', bottom: 80, color: '#fff', fontSize: 14, fontWeight: '600' },
  permText:    { color: '#fff', textAlign: 'center', margin: 40, fontSize: 15 },
  permBtn:     { backgroundColor: '#FF2E63', padding: 16, borderRadius: 12, marginHorizontal: 40, alignItems: 'center' },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
