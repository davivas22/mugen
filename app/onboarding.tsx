import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const IMAGE_WIDTH = width;
const IMAGE_HEIGHT = height;

const slides = [
  {
    id: '1',
    image: require('../assets/images/mige.jpg'),
    title: 'Entrena con amigos\ny alcanza tus metas',
  },
  {
    id: '2',
    image: require('../assets/images/squad.jpg'),
    title: 'Entrena con amigos\ny alcanza tus metas',
  },
  {
    id: '3',
    image: require('../assets/images/image.png'),
    title: 'Entrena con amigos\ny alcanza tus metas',
  },
];

export default function Onboarding() {
  const [modalVisible, setModalVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacities = useRef(slides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const isAnimating = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (isAnimating.current) return;

      const next = (currentIndex + 1) % slides.length;
      isAnimating.current = true;

      Animated.parallel([
        Animated.timing(opacities[currentIndex], {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(opacities[next], {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(next);
        isAnimating.current = false;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <View style={styles.container}>

      {/* Todas las imágenes apiladas — cada una con su propia opacidad */}
      {slides.map((slide, index) => (
        <Animated.View
          key={slide.id}
          style={[StyleSheet.absoluteFill, { opacity: opacities[index] }]}
        >
          <Image
            source={slide.image}
            style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}
            contentFit="cover"
          />
        </Animated.View>
      ))}

      {/* Gradiente */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Contenido flotante */}
      <View style={styles.content}>

        {slides[currentIndex].title ? (
          <Text style={styles.title}>{slides[currentIndex].title}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: pressed ? '#ff4da6' : '#01060b' }]}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.buttonText}>Empezar</Text>
        </TouchableOpacity>

        <Text style={styles.loginText}>
          Ya tienes una cuenta?{' '}
          <Text style={styles.loginLink} onPress={() => setModalVisible(true)}>
            Iniciar Sesion
          </Text>
        </Text>

      </View>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Iniciar Sesion</Text>
              <Text style={styles.close} onPress={() => setModalVisible(false)}>✕</Text>
            </View>

            <TouchableOpacity style={styles.option}>
              <View style={styles.optionRow}>
                <Image
                  source={require('../assets/images/google.png')}
                  style={styles.googleIcon}
                />
                <Text style={{ fontSize: 16 }}>Iniciar Sesion con Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                setModalVisible(false);
                router.push('/login');
              }}
            >
              <Text>Iniciar sesion con Email</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you agree to Terms and Privacy Policy
            </Text>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 52,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 40,
    lineHeight: 42,
  },

  button: {
    width: '85%',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  loginText: {
    color: 'rgba(255,255,255,0.75)',
  },

  loginLink: {
    color: '#ff4da6',
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  close: {
    fontSize: 20,
  },

  option: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  googleIcon: {
    width: 20,
    height: 20,
  },

  terms: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
  },
});
