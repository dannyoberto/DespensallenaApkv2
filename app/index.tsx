import { useSplashController } from '@/contexts/splash-controller-context';
import { OptimizedWebView, OptimizedWebViewRef } from '@/components/optimized-webview-v2';
import { logger } from '@/utils/logger';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';

export default function HomeScreen() {
  const webViewRef = useRef<OptimizedWebViewRef>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const { notifyWebViewReady } = useSplashController();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        // WebView can go back, navigate back in the WebView
        webViewRef.current?.goBack();
        return true; // Prevent default behavior (exit app)
      }
      
      // WebView cannot go back, show confirmation dialog
      Alert.alert(
        'Salir de la aplicación',
        '¿Estás seguro que deseas salir?',
        [
          {
            text: 'Cancelar',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'Salir',
            onPress: () => BackHandler.exitApp(),
            style: 'destructive',
          },
        ],
        { cancelable: true }
      );
      
      return true; // Prevent immediate exit, wait for user confirmation
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  return (
    <OptimizedWebView
      ref={webViewRef}
      source={{ uri: 'https://despensallena.com' }}
      baseUrl="https://despensallena.com"
      onLoadStart={() => {
        logger.info('📱 WebView loading started');
      }}
      onLoadEnd={() => {
        logger.info('✅ WebView loading completed');
        notifyWebViewReady();
      }}
      onError={(error) => {
        logger.error('❌ WebView error:', error);
      }}
      onNavigationStateChange={(canGoBack) => {
        setCanGoBack(canGoBack);
      }}
    />
  );
}
