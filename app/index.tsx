import { OptimizedWebView, OptimizedWebViewRef } from '@/components/optimized-webview';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';

export default function HomeScreen() {
  const webViewRef = useRef<OptimizedWebViewRef>(null);
  const [canGoBack, setCanGoBack] = useState(false);

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
      onLoadStart={() => {
        console.log('WebView loading started');
      }}
      onLoadEnd={() => {
        console.log('WebView loading completed');
      }}
      onError={(error) => {
        console.error('WebView error:', error);
      }}
      onNavigationStateChange={(canGoBack) => {
        setCanGoBack(canGoBack);
      }}
    />
  );
}
