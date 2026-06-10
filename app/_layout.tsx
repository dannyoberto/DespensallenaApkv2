import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EnhancedSplashScreen } from '@/components/enhanced-splash-screen';
import { SplashControllerProvider, useSplashController } from '@/contexts/splash-controller-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { webViewReady, showSplashOverlay, dismissSplashOverlay } = useSplashController();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // noop
    });
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={styles.root}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>

        {showSplashOverlay && (
          <View style={styles.splashOverlay} pointerEvents="auto">
            <EnhancedSplashScreen
              appReady={webViewReady}
              onAnimationComplete={dismissSplashOverlay}
              duration={3500}
            />
          </View>
        )}
      </View>
      <StatusBar style="light" backgroundColor="#80b918" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SplashControllerProvider>
        <RootLayoutContent />
      </SplashControllerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
