/**
 * Enhanced Splash Screen Component
 * Pantalla de carga mejorada con gradientes, animaciones avanzadas y carga inteligente
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface EnhancedSplashScreenProps {
  onAnimationComplete?: () => void;
  duration?: number;
}

const { width, height } = Dimensions.get('window');

// Mensajes dinámicos basados en la hora del día
const getTimeBasedMessages = () => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return [
      {
        title: "¡Buenos días!",
        subtitle: "Comienza tu día con productos frescos",
        icon: "🌅"
      },
      {
        title: "Desayuno Saludable",
        subtitle: "Productos frescos para empezar bien el día",
        icon: "🥐"
      }
    ];
  } else if (hour >= 12 && hour < 18) {
    return [
      {
        title: "¡Buenas tardes!",
        subtitle: "Tu despensa siempre llena de productos frescos",
        icon: "🛒"
      },
      {
        title: "Ofertas Especiales",
        subtitle: "Descuentos exclusivos en productos La Rosa Selecta",
        icon: "🎉"
      }
    ];
  } else {
    return [
      {
        title: "¡Buenas noches!",
        subtitle: "Prepara tu despensa para mañana",
        icon: "🌙"
      },
      {
        title: "Envío Rápido",
        subtitle: "Recibe tus productos en tiempo récord",
        icon: "🚚"
      }
    ];
  }
};

// Mensajes adicionales
const ADDITIONAL_MESSAGES = [
  {
    title: "Calidad Garantizada",
    subtitle: "Productos frescos y de la mejor calidad",
    icon: "⭐"
  },
  {
    title: "La Rosa Selecta",
    subtitle: "Marca de confianza en productos frescos",
    icon: "🌹"
  }
];

// Componente de partículas decorativas
const FloatingParticle = ({ delay, duration, size, opacity }: {
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -20,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: 10,
              duration: duration * 1.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: -10,
              duration: duration * 1.5,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.2,
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration: duration * 0.8,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };

    const timer = setTimeout(animate, delay);
    return () => clearTimeout(timer);
  }, [delay, duration, translateY, translateX, scale]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
        },
      ]}
    />
  );
};

export function EnhancedSplashScreen({ 
  onAnimationComplete, 
  duration = 3000 
}: EnhancedSplashScreenProps) {
  const colorScheme = useColorScheme();
  const { isConnected } = useNetworkStatus();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  // Obtener mensajes dinámicos
  const timeBasedMessages = getTimeBasedMessages();
  const allMessages = [...timeBasedMessages, ...ADDITIONAL_MESSAGES];
  
  // Animaciones principales
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const messageFadeAnim = useRef(new Animated.Value(1)).current;
  
  // Nuevas animaciones
  const logoGrowAnim = useRef(new Animated.Value(0.3)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  // Simular carga inteligente
  useEffect(() => {
    const loadingSteps = [
      { progress: 20, delay: 500, text: "Inicializando..." },
      { progress: 40, delay: 1000, text: "Cargando recursos..." },
      { progress: 60, delay: 1500, text: "Conectando con servidor..." },
      { progress: 80, delay: 2000, text: "Preparando interfaz..." },
      { progress: 100, delay: 2500, text: "¡Listo!" },
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setLoadingProgress(loadingSteps[currentStep].progress);
        currentStep++;
      } else {
        setIsReady(true);
        clearInterval(progressInterval);
      }
    }, 500);

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    // Animación de entrada mejorada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(gradientAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de crecimiento del logo (grow effect)
    Animated.sequence([
      // Crecimiento inicial dramático
      Animated.timing(logoGrowAnim, {
        toValue: 1.2,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      // Ajuste suave al tamaño final
      Animated.timing(logoGrowAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de escala suave del logo
    Animated.timing(logoScaleAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Animación de partículas
    Animated.timing(particleAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    // Rotación de mensajes mejorada
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % allMessages.length);
    }, duration / allMessages.length);

    // Animación de fade para mensajes
    const messageFadeInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(messageFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(messageFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, duration / allMessages.length);

    // Completar animación cuando esté listo
    const completeTimer = setTimeout(() => {
      if (isReady) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          onAnimationComplete?.();
        });
      }
    }, duration);

    return () => {
      clearInterval(messageInterval);
      clearInterval(messageFadeInterval);
      clearTimeout(completeTimer);
    };
  }, [fadeAnim, scaleAnim, slideAnim, gradientAnim, logoGrowAnim, logoScaleAnim, particleAnim, messageFadeAnim, duration, onAnimationComplete, isReady, allMessages.length]);

  const currentMessage = allMessages[currentMessageIndex];

  // Colores del gradiente
  const gradientColors = colorScheme === 'dark' 
    ? ['#1a1a1a', '#2d2d2d', '#80b918', '#6ba315']
    : ['#80b918', '#6ba315', '#5a8f12', '#4a7a0f'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { 
            opacity: fadeAnim 
          }
        ]}
      >
        {/* Partículas decorativas */}
        <Animated.View
          style={[
            styles.particlesContainer,
            { opacity: particleAnim }
          ]}
        >
          <FloatingParticle delay={0} duration={3000} size={8} opacity={0.6} />
          <FloatingParticle delay={500} duration={2500} size={6} opacity={0.4} />
          <FloatingParticle delay={1000} duration={3500} size={10} opacity={0.5} />
          <FloatingParticle delay={1500} duration={2800} size={7} opacity={0.3} />
          <FloatingParticle delay={2000} duration={3200} size={9} opacity={0.4} />
        </Animated.View>
        {/* Logo Principal */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: Animated.multiply(logoScaleAnim, logoGrowAnim) },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Despensallena</Text>
        </Animated.View>

      {/* Mensaje Rotativo */}
      <Animated.View
        style={[
          styles.messageContainer,
          { opacity: messageFadeAnim }
        ]}
      >
        <Text style={styles.messageIcon}>{currentMessage.icon}</Text>
        <Text style={styles.messageTitle}>{currentMessage.title}</Text>
        <Text style={styles.messageSubtitle}>{currentMessage.subtitle}</Text>
      </Animated.View>

        {/* Barra de Progreso Inteligente */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: `${loadingProgress}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {loadingProgress < 100 ? `Cargando... ${loadingProgress}%` : '¡Listo!'}
          </Text>
          
          {/* Indicador de conexión */}
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot, 
              { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
            ]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Conectado' : 'Sin conexión'}
            </Text>
          </View>
        </View>

        {/* Información Adicional */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>Productos frescos • Envío rápido • Calidad garantizada</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
    top: '20%',
    left: '10%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    zIndex: 2,
  },
  logoWrapper: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
    marginBottom: 20,
  },
  logo: {
    width: 140,
    height: 140,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 0,
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 50,
    minHeight: 100,
    justifyContent: 'center',
    zIndex: 2,
  },
  messageIcon: {
    fontSize: 40,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messageSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 50,
    zIndex: 2,
  },
  progressTrack: {
    width: '85%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    shadowColor: '#FFFFFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  progressText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  footerInfo: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    zIndex: 2,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
