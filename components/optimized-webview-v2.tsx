/**
 * Optimized WebView Component v2
 * Fully optimized with persistent cache, modular scripts, and better performance
 */

import { getDomainCategory, isUrlAllowed, logDomainAccess } from '@/config/allowed-domains';
import {
    BASE_INJECTION_SCRIPT,
    injectScriptLazy,
    INTERACTIVE_INJECTION_SCRIPT
} from '@/config/injection-scripts';
import { Colors } from '@/constants/theme';
import { useCacheManager } from '@/hooks/use-cache-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleOAuth } from '@/hooks/use-google-oauth';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { webviewLogger } from '@/utils/logger';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { GoogleOAuthHandler } from './google-oauth-handler';
import { IntelligentPreloader } from './intelligent-preloader';
import { NetworkStatusIndicator } from './network-status-indicator';

interface OptimizedWebViewProps {
  source: { uri: string };
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  onNavigationStateChange?: (canGoBack: boolean) => void;
}

export interface OptimizedWebViewRef {
  goBack: () => void;
  reload: () => void;
  clearCache: () => Promise<void>;
}

export const OptimizedWebView = forwardRef<OptimizedWebViewRef, OptimizedWebViewProps>(({ 
  source, 
  onLoadStart, 
  onLoadEnd, 
  onError,
  onNavigationStateChange 
}, ref) => {
  // State
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isGooglePage, setIsGooglePage] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(source.uri);
  
  // Refs
  const webViewRef = useRef<WebView>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const lastLoadTime = useRef<number>(0);
  
  // Hooks
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable, isSlowConnection, connectionType } = useNetworkStatus();
  const cacheManager = useCacheManager();
  const googleOAuth = useGoogleOAuth();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    goBack: () => {
      webViewRef.current?.goBack();
    },
    reload: () => {
      webViewRef.current?.reload();
    },
    clearCache: async () => {
      await cacheManager.clear();
      webViewRef.current?.reload();
    },
  }));

  // Cache page HTML on successful load
  const cachePage = useCallback(async (url: string, html: string) => {
    try {
      await cacheManager.set(
        `page_${url}`,
        { html, url, cachedAt: Date.now() },
        'html'
      );
      webviewLogger.info(`✅ Cached page: ${url}`);
    } catch (error) {
      webviewLogger.error('Failed to cache page:', error);
    }
  }, [cacheManager]);

  // Try to load from cache
  const loadFromCache = useCallback(async (url: string): Promise<string | null> => {
    try {
      const cached = await cacheManager.get<{ html: string; url: string; cachedAt: number }>(
        `page_${url}`,
        'html'
      );
      
      if (cached) {
        webviewLogger.info(`🎯 Loading page from cache: ${url}`);
        return cached.html;
      }
    } catch (error) {
      webviewLogger.error('Failed to load from cache:', error);
    }
    return null;
  }, [cacheManager]);

  // Handle network status changes
  useEffect(() => {
    if (!isConnected || !isInternetReachable) {
      setHasError(true);
      webviewLogger.warn('📡 Network disconnected');
    } else if (hasError && isConnected && isInternetReachable) {
      setHasError(false);
      setRetryCount(0);
      webViewRef.current?.reload();
      webviewLogger.info('📡 Network reconnected, reloading...');
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

  // Performance mark
  const markLoadStart = useCallback(() => {
    lastLoadTime.current = Date.now();
    webviewLogger.mark('webview-load-start');
  }, []);

  const markLoadEnd = useCallback(() => {
    const loadTime = Date.now() - lastLoadTime.current;
    webviewLogger.mark('webview-load-end');
    webviewLogger.measure('webview-load-time', 'webview-load-start', 'webview-load-end');
    webviewLogger.info(`⏱️ Page loaded in ${loadTime}ms`);
  }, []);

  // Handle load start
  const handleLoadStart = useCallback(() => {
    markLoadStart();
    setLoading(true);
    setShowProgress(true);
    setProgress(0);
    setHasError(false);
    
    onLoadStart?.();
  }, [onLoadStart, markLoadStart]);

  // Handle load progress
  const handleLoadProgress = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setProgress(nativeEvent.progress);
  }, []);

  // Handle load end
  const handleLoadEnd = useCallback(() => {
    markLoadEnd();
    setLoading(false);
    setShowProgress(false);
    setProgress(0);
    setRetryCount(0);
    
    // Inject base scripts immediately
    injectScriptLazy(webViewRef, BASE_INJECTION_SCRIPT, 50);
    
    // Inject interactive scripts after a short delay
    injectScriptLazy(webViewRef, INTERACTIVE_INJECTION_SCRIPT, 500);
    
    // Get page HTML for caching
    const getPageHtml = `
      (function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'page_html',
          html: document.documentElement.outerHTML,
          url: window.location.href
        }));
      })();
    `;
    
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(getPageHtml);
    }, 1000);
    
    onLoadEnd?.();
  }, [onLoadEnd, markLoadEnd]);

  // Handle error
  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    webviewLogger.error('WebView error:', nativeEvent);
    
    setLoading(false);
    setShowProgress(false);
    setHasError(true);
    
    // Retry logic with exponential backoff
    if (retryCount < 3 && isConnected) {
      const delay = 2000 * Math.pow(2, retryCount); // 2s, 4s, 8s
      webviewLogger.info(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        webViewRef.current?.reload();
      }, delay);
    } else {
      onError?.(nativeEvent);
    }
  }, [retryCount, isConnected, onError]);

  // Handle navigation state change
  const handleNavigationStateChange = useCallback((navState: any) => {
    setCurrentUrl(navState.url);
    
    // Check if we're on a Google page
    const isGoogle = navState.url.includes('accounts.google.com') || 
                     navState.url.includes('google.com') ||
                     navState.url.includes('googleapis.com') ||
                     navState.url.includes('gstatic.com');
    
    if (isGoogle !== isGooglePage) {
      setIsGooglePage(isGoogle);
      webviewLogger.debug('🔍 URL change detected - Google page:', isGoogle);
      
      // Reset OAuth state when navigating to Google pages
      if (isGoogle) {
        googleOAuth.resetOAuthState();
      }
    }
    
    webviewLogger.debug('Navigation state changed:', {
      canGoBack: navState.canGoBack,
      url: navState.url,
      isGooglePage: isGoogle
    });
    
    onNavigationStateChange?.(navState.canGoBack);
  }, [onNavigationStateChange, isGooglePage, googleOAuth]);

  // Handle message from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'link_clicked':
          webviewLogger.debug('🖱️ Link clicked:', data.url);
          setLoading(true);
          setShowProgress(true);
          setProgress(0);
          break;
          
        case 'page_html':
          // Cache the page HTML
          cachePage(data.url, data.html);
          break;
          
        case 'page_check':
          setIsGooglePage(data.isGooglePage);
          webviewLogger.debug('🔍 Page check:', data.isGooglePage ? 'Google' : 'Regular', data.url);
          
          // Force OAuth state to false when on Google pages
          if (data.isGooglePage) {
            googleOAuth.resetOAuthState();
          }
          break;
          
        case 'google_oauth_start':
          webviewLogger.info('🔐 Google OAuth started');
          break;
          
        case 'oauth_success':
          webviewLogger.info('✅ OAuth successful');
          googleOAuth.handleOAuthSuccess();
          break;
          
        case 'navigate_to_password':
          webviewLogger.debug('📝 Navigating to password page');
          googleOAuth.resetOAuthState();
          break;
          
        case 'woocommerce_optimization_complete':
          webviewLogger.info('✅ WooCommerce optimizations applied');
          break;
          
        default:
          webviewLogger.debug('📨 WebView message:', data.type);
      }
    } catch (error) {
      // Non-JSON message, ignore
      webviewLogger.debug('📨 Non-JSON message:', event.nativeEvent.data);
    }
  }, [googleOAuth, cachePage]);

  // Retry function
  const handleRetry = useCallback(() => {
    setHasError(false);
    setRetryCount(0);
    webViewRef.current?.reload();
  }, []);

  // WebView configuration for optimal performance
  const webViewConfig = {
    source,
    javaScriptEnabled: true,
    domStorageEnabled: true,
    startInLoadingState: false,
    scalesPageToFit: true,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    cacheEnabled: cacheManager.config.enabled,
    // Use aggressive caching for better performance
    cacheMode: isSlowConnection ? 'LOAD_CACHE_ELSE_NETWORK' : 'LOAD_DEFAULT',
    mixedContentMode: 'compatibility' as const,
    thirdPartyCookiesEnabled: true,
    allowsBackForwardNavigationGestures: true,
    bounces: false,
    scrollEnabled: true,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
    javaScriptCanOpenWindowsAutomatically: true,
    allowsLinkPreview: false,
    // Updated User-Agent to avoid 403 Forbidden errors
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true,
    renderToHardwareTextureAndroid: true,
    androidLayerType: 'hardware',
    // Additional headers to avoid detection
    originWhitelist: ['*'],
    // Hide WebView indicators
    hideKeyboardAccessoryView: true,
    keyboardDisplayRequiresUserAction: false,
    // Inject click interceptor BEFORE page content loads for instant feedback
    injectedJavaScriptBeforeContentLoaded: INTERACTIVE_INJECTION_SCRIPT,
    onLoadStart: handleLoadStart,
    onLoadProgress: handleLoadProgress,
    onLoadEnd: handleLoadEnd,
    onError: handleError,
    onMessage: handleMessage,
    onNavigationStateChange: handleNavigationStateChange,
    onShouldStartLoadWithRequest: (request: any) => {
      const url = request.url;
      const isMainFrame = request.isTopFrame !== false;
      
      // Handle Google OAuth URLs
      if (googleOAuth.handleGoogleOAuthUrl(url)) {
        return true;
      }
      
      // Check if URL is allowed using centralized configuration
      const isAllowed = isUrlAllowed(url);
      
      if (isAllowed) {
        const category = getDomainCategory(url);
        logDomainAccess(url, category);
        
        // Log short URL access for metrics tracking
        if (category === 'short-url') {
          webviewLogger.info(`🔗 Short URL accessed: ${url} (category: ${category})`);
        }
        
        // Activate spinner immediately for main frame navigations (except Google OAuth)
        const isGoogleAuth = url.includes('accounts.google.com') || 
                            url.includes('google.com/oauth') ||
                            url.includes('googleapis.com') ||
                            url.includes('gstatic.com');
        
        if (isMainFrame && !isGoogleAuth && url !== currentUrl) {
          webviewLogger.debug('🚀 Navigation detected - activating spinner immediately:', url);
          setLoading(true);
          setShowProgress(true);
          setProgress(0);
        }
      }
      
      return isAllowed;
    },
  };

  // Get cache stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await cacheManager.getStats();
      webviewLogger.debug('📊 Cache stats:', {
        entries: stats.totalEntries,
        size: `${stats.totalSize.toFixed(2)}MB`,
        hitRate: `${stats.hitRate.toFixed(1)}%`,
      });
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [cacheManager]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]} edges={['top', 'left', 'right']}>
      <NetworkStatusIndicator showWhenConnected={isSlowConnection} />
      
      {/* Google OAuth Handler - Only show when not on Google pages */}
      <GoogleOAuthHandler
        showProgress={!isGooglePage}
        onAuthSuccess={() => {
          webviewLogger.info('✅ Google OAuth successful');
          googleOAuth.handleOAuthSuccess();
        }}
        onAuthError={(error) => {
          webviewLogger.error('❌ Google OAuth error:', error);
          googleOAuth.handleOAuthError(error);
        }}
      />
      
      {/* Intelligent Preloader */}
      <IntelligentPreloader
        strategy="ESSENTIAL"
        showProgress={false}
        autoStart={true}
        onPreloadComplete={(results) => {
          const successful = results.filter(r => r.success).length;
          webviewLogger.info(`✅ Preloading completed: ${successful}/${results.length}`);
        }}
        onPreloadError={(error) => {
          webviewLogger.warn(`❌ Preloading error: ${error}`);
        }}
      />
      
      {/* Progress Bar */}
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
      
      {/* Loading Indicator */}
      {loading && !isGooglePage && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={Colors[colorScheme ?? 'light'].spinner} 
          />
          {isSlowConnection && (
            <Text style={styles.loadingText}>Conexión lenta detectada...</Text>
          )}
        </View>
      )}
      
      {/* Error States */}
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
      
      {/* WebView */}
      <WebView
        ref={webViewRef}
        {...webViewConfig}
        style={[styles.webview, { marginBottom: Math.max(insets.bottom + 40, 60) }]}
      />
      
      {/* Cache Info (Debug) */}
      {__DEV__ && (
        <View style={[styles.debugInfo, { bottom: Math.max(insets.bottom + 40, 60) }]}>
          <Text style={styles.debugText}>
            Cache: {cacheManager.config.enabled ? 'ON' : 'OFF'} | 
            Net: {connectionType} | 
            Slow: {isSlowConnection ? 'YES' : 'NO'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
});

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
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
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
  debugInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
    zIndex: 10,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

