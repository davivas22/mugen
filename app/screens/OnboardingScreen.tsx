import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../context/ThemeContext';

const OnboardingScreen = () => {
  const { C } = useColors();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop' }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.overlay} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: C.textPrimary }]}>
            MUGEN: <Text style={{ color: C.mugenPink }}>Rompe tus límites</Text>
          </Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            La experiencia de fitness gamificada más potente.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: C.mugenPink, shadowColor: C.mugenPink }]}
            onPress={() => navigation.navigate('register' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>EMPEZAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('login' as any)}
          >
            <Text style={[styles.secondaryButtonText, { color: C.textPrimary }]}>
              Ya tengo cuenta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  imageContainer: {
    height: '50%',
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 20,
  },
  image: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  textContainer: {
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
