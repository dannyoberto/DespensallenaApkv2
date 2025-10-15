import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EnhancedSplashScreen } from '@/components/enhanced-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showEnhancedSplash, setShowEnhancedSplash] = useState(true);

  useEffect(() => {
    // Hide the splash screen when the app is ready
    const hideSplash = async () => {
      // Wait longer to ensure WebView is ready and splash screen is visible
      await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds
      await SplashScreen.hideAsync();
    };
    
    hideSplash();
  }, []);

  const handleSplashComplete = () => {
    setShowEnhancedSplash(false);
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {showEnhancedSplash ? (
          <EnhancedSplashScreen 
            onAnimationComplete={handleSplashComplete}
            duration={3500}
          />
        ) : (
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        )}
        <StatusBar style="light" backgroundColor="#80b918" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
