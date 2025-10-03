import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleOAuth } from '@/hooks/use-google-oauth';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useWebViewCache } from '@/hooks/use-webview-cache';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { GoogleOAuthHandler } from './google-oauth-handler';
import { IntelligentPreloader } from './intelligent-preloader';
import { NetworkStatusIndicator } from './network-status-indicator';

interface OptimizedWebViewProps {
  source: { uri: string };
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

export function OptimizedWebView({ 
  source, 
  onLoadStart, 
  onLoadEnd, 
  onError 
}: OptimizedWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  
  const colorScheme = useColorScheme();
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);
  
  const { isConnected, isInternetReachable, isSlowConnection } = useNetworkStatus();
  const { 
    cacheConfig, 
    clearCache, 
    getCacheSize, 
    isCacheEnabled, 
    preloadResources 
  } = useWebViewCache();
  const {
    oauthState,
    handleGoogleOAuthUrl,
    startAuthentication,
    handleOAuthSuccess,
    handleOAuthError,
  } = useGoogleOAuth();

  // Critical resources to preload
  const criticalResources = [
    'https://despensallena.com/favicon.ico',
    'https://despensallena.com/assets/css/main.css',
    'https://despensallena.com/assets/js/main.js',
  ];

  // Preload critical resources on mount
  useEffect(() => {
    if (isCacheEnabled && isConnected) {
      preloadResources(criticalResources);
    }
  }, [isCacheEnabled, isConnected, preloadResources]);

  // Handle network status changes
  useEffect(() => {
    if (!isConnected || !isInternetReachable) {
      setHasError(true);
    } else if (hasError && isConnected && isInternetReachable) {
      // Retry loading when connection is restored
      setHasError(false);
      setRetryCount(0);
      webViewRef.current?.reload();
    }
  }, [isConnected, isInternetReachable, hasError]);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnimation]);

  // Handle load start
  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setShowProgress(true);
    setProgress(0);
    setHasError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  // Handle load progress
  const handleLoadProgress = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setProgress(nativeEvent.progress);
  }, []);

  // Handle load end
  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    setShowProgress(false);
    setProgress(0);
    setRetryCount(0);
    
    // Inject JavaScript to ensure dynamic content loads properly
    const injectScript = `
      (function() {
        // Force re-render of dynamic content
        setTimeout(function() {
          // Trigger any pending DOM updates
          var event = new Event('DOMContentLoaded');
          document.dispatchEvent(event);
          
          // Force visibility of Google login button
          var googleButtons = document.querySelectorAll('a[href*="google"], a[data-provider="google"], a[href*="loginSocial=google"]');
          googleButtons.forEach(function(button) {
            button.style.display = 'block';
            button.style.visibility = 'visible';
            button.style.opacity = '1';
            
            // Add click handler for Google OAuth
            button.addEventListener('click', function(e) {
              console.log('Google OAuth button clicked:', button.href);
              // Allow the navigation to proceed
            });
          });
          
          // Re-trigger any lazy loading
          var lazyImages = document.querySelectorAll('img[data-src]');
          lazyImages.forEach(function(img) {
            img.src = img.dataset.src;
          });
        }, 1000);
        
        // Additional check after 3 seconds
        setTimeout(function() {
          var googleButtons = document.querySelectorAll('a[href*="google"], a[data-provider="google"], a[href*="loginSocial=google"]');
          googleButtons.forEach(function(button) {
            if (button.style.display === 'none' || button.style.visibility === 'hidden') {
              button.style.display = 'block';
              button.style.visibility = 'visible';
              button.style.opacity = '1';
            }
          });
        }, 3000);
        
        // Monitor for Google OAuth redirects and button clicks
        var originalLocation = window.location.href;
        
        // Detect when user clicks "Siguiente" button
        setTimeout(function() {
          var siguienteButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button:contains("Siguiente"), button:contains("Next")');
          siguienteButtons.forEach(function(button) {
            button.addEventListener('click', function() {
              console.log('Siguiente button clicked - starting authentication');
              // Send message to React Native to start authentication
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'start_authentication'
              }));
            });
          });
        }, 2000);
        
        setInterval(function() {
          if (window.location.href !== originalLocation) {
            console.log('URL changed to:', window.location.href);
            if (window.location.href.includes('despensallena.com') && 
                (window.location.href.includes('code=') || window.location.href.includes('access_token='))) {
              console.log('OAuth success detected');
              // Send message to React Native
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'oauth_success',
                url: window.location.href
              }));
            }
          }
        }, 1000);
      })();
    `;
    
    webViewRef.current?.injectJavaScript(injectScript);
    onLoadEnd?.();
  }, [onLoadEnd]);

  // Handle error
  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    
    setLoading(false);
    setShowProgress(false);
    setHasError(true);
    
    // Retry logic
    if (retryCount < 3 && isConnected) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        webViewRef.current?.reload();
      }, 2000 * (retryCount + 1)); // Exponential backoff
    } else {
      onError?.(nativeEvent);
    }
  }, [retryCount, isConnected, onError]);

  // Handle message from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      // Handle start authentication message
      if (data.type === 'start_authentication') {
        console.log('🚀 Starting authentication from WebView');
        startAuthentication();
      }
      
      // Handle OAuth success messages
      if (data.type === 'oauth_success') {
        console.log('✅ OAuth success detected:', data.url);
        handleOAuthSuccess();
      }
    } catch (error) {
      console.log('WebView message (non-JSON):', event.nativeEvent.data);
    }
  }, [startAuthentication, handleOAuthSuccess]);

  // Retry function
  const handleRetry = useCallback(() => {
    setHasError(false);
    setRetryCount(0);
    webViewRef.current?.reload();
  }, []);

  // Clear cache function
  const handleClearCache = useCallback(async () => {
    try {
      await clearCache();
      Alert.alert('Cache Limpiado', 'El cache ha sido limpiado exitosamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo limpiar el cache.');
    }
  }, [clearCache]);

  // WebView configuration for optimal performance
  const webViewConfig = {
    source,
    style: styles.webview,
    javaScriptEnabled: true,
    domStorageEnabled: true,
    startInLoadingState: false,
    scalesPageToFit: true,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    cacheEnabled: isCacheEnabled,
    cacheMode: 'LOAD_DEFAULT' as const,
    mixedContentMode: 'compatibility' as const,
    thirdPartyCookiesEnabled: true,
    allowsBackForwardNavigationGestures: true,
    bounces: false,
    scrollEnabled: true,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
    // Enhanced JavaScript support for dynamic content
    javaScriptCanOpenWindowsAutomatically: true,
    allowsLinkPreview: false,
    // User agent to avoid bot detection
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    // Enhanced security and compatibility
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    onLoadStart: handleLoadStart,
    onLoadProgress: handleLoadProgress,
    onLoadEnd: handleLoadEnd,
    onError: handleError,
    onMessage: handleMessage,
    // Performance optimizations
    renderToHardwareTextureAndroid: true,
    // Network optimizations
    onShouldStartLoadWithRequest: (request: any) => {
      const url = request.url;
      
      // Handle Google OAuth URLs
      if (handleGoogleOAuthUrl(url)) {
        return true;
      }
      
      // Allow navigation to same domain, shortened URLs, and Google OAuth
      return url.includes('despensallena.com') || 
             url.startsWith('data:') || 
             url.startsWith('file:') ||
             url.startsWith('https://tify.cc/') ||
             url.includes('google.com') ||
             url.includes('googleapis.com') ||
             url.includes('gstatic.com') ||
             url.includes('accounts.google.com') ||
             url.includes('oauth2.googleapis.com') ||
             url.includes('loginSocial=google');
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <NetworkStatusIndicator showWhenConnected={isSlowConnection} />
      
      {/* Google OAuth Handler */}
      <GoogleOAuthHandler
        showProgress={true}
        onAuthSuccess={() => {
          console.log('✅ Google OAuth successful');
          handleOAuthSuccess();
        }}
        onAuthError={(error) => {
          console.error('❌ Google OAuth error:', error);
          handleOAuthError(error);
        }}
      />
      
      {/* Intelligent Preloader */}
      <IntelligentPreloader
        strategy="ESSENTIAL"
        showProgress={false}
        autoStart={true}
        onPreloadComplete={(results) => {
          console.log(`✅ Preloading completed: ${results.filter(r => r.success).length}/${results.length} successful`);
        }}
        onPreloadError={(error) => {
          console.warn(`❌ Preloading error: ${error}`);
        }}
      />
      
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: Colors[colorScheme ?? 'light'].spinner,
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      )}
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={Colors[colorScheme ?? 'light'].spinner} 
          />
        </View>
      )}
      
      {hasError && !isConnected && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Sin conexión a internet</Text>
          <Text style={styles.errorSubtext}>
            Verifica tu conexión y vuelve a intentar
          </Text>
        </View>
      )}
      
      {hasError && isConnected && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar la página</Text>
          <Text style={styles.errorSubtext}>
            Intento {retryCount + 1} de 3
          </Text>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        {...webViewConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});
