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
import { useCacheManager } from '@/hooks/use-cache-manager';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleOAuth } from '@/hooks/use-google-oauth';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { webviewLogger } from '@/utils/logger';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { GoogleOAuthHandler } from './google-oauth-handler';
// import { IntelligentPreloader } from './intelligent-preloader'; // DISABLED: Not needed for WordPress
import { NetworkStatusIndicator } from './network-status-indicator';
import { IconSymbol } from './ui/icon-symbol';

interface OptimizedWebViewProps {
  source: { uri: string };
  baseUrl?: string; // URL principal para el botón Home
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
  baseUrl,
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
  const [canGoBack, setCanGoBack] = useState(false);
  
  // Calculate dynamic bottom spacing
  const getBottomSpacing = () => {
    const baseSpacing = Math.max(insets.bottom, 20);
    const navigationHeight = 60; // Approximate height of navigation footer
    const debugHeight = __DEV__ ? 20 : 0; // Height of debug info when visible
    
    // Don't add progress bar height here since it's positioned absolutely
    return baseSpacing + navigationHeight + debugHeight;
  };
  
  // Refs
  const webViewRef = useRef<WebView>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const lastLoadTime = useRef<number>(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Clear loading timeout
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Force stop loading after timeout (prevents spinner from getting stuck)
  const startLoadingTimeout = useCallback(() => {
    clearLoadingTimeout();
    
    // Auto-hide loading indicator after 30 seconds max
    loadingTimeoutRef.current = setTimeout(() => {
      webviewLogger.warn('⚠️ Loading timeout reached - forcing loading state to false');
      setLoading(false);
      setShowProgress(false);
      setProgress(0);
    }, 30000);
  }, [clearLoadingTimeout]);

  // Handle load start
  const handleLoadStart = useCallback(() => {
    markLoadStart();
    setLoading(true);
    setShowProgress(true);
    setProgress(0);
    setHasError(false);
    
    // Start timeout to prevent stuck spinner
    startLoadingTimeout();
    
    onLoadStart?.();
  }, [onLoadStart, markLoadStart, startLoadingTimeout]);

  // Handle load progress
  const handleLoadProgress = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setProgress(nativeEvent.progress);
  }, []);

  // Handle load end
  const handleLoadEnd = useCallback(() => {
    markLoadEnd();
    
    // Clear loading timeout
    clearLoadingTimeout();
    
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
  }, [onLoadEnd, markLoadEnd, clearLoadingTimeout]);

  // Handle error
  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    webviewLogger.error('WebView error:', nativeEvent);
    
    // Clear loading timeout
    clearLoadingTimeout();
    
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
  }, [retryCount, isConnected, onError, clearLoadingTimeout]);

  // Handle navigation state change
  const handleNavigationStateChange = useCallback((navState: any) => {
    setCurrentUrl(navState.url);
    setCanGoBack(navState.canGoBack);
    
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
          startLoadingTimeout();
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
  }, [googleOAuth, cachePage, startLoadingTimeout]);

  // Retry function
  const handleRetry = useCallback(() => {
    setHasError(false);
    setRetryCount(0);
    webViewRef.current?.reload();
  }, []);

  // Handle Back button
  const handleGoBack = useCallback(() => {
    if (canGoBack) {
      webViewRef.current?.goBack();
      webviewLogger.debug('🔙 Navigating back');
    }
  }, [canGoBack]);

  // Handle Home button
  const handleGoHome = useCallback(() => {
    const homeUrl = baseUrl || source.uri;
    webViewRef.current?.injectJavaScript(`window.location.href = '${homeUrl}';`);
    webviewLogger.debug('🏠 Navigating to home:', homeUrl);
  }, [baseUrl, source.uri]);

  // WebView configuration for optimal performance
  const webViewConfig = {
    source,
    javaScriptEnabled: true,
    domStorageEnabled: true,
    startInLoadingState: true,
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
          webviewLogger.debug('🚀 Navigation detected - activating progress bar immediately:', url);
          setLoading(true);
          setShowProgress(true);
          setProgress(0);
          startLoadingTimeout();
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

  // Cleanup loading timeout on unmount
  useEffect(() => {
    return () => {
      clearLoadingTimeout();
    };
  }, [clearLoadingTimeout]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#80b918' }]} edges={['top', 'left', 'right']}>
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
      
      {/* Intelligent Preloader - DISABLED for WordPress/WooCommerce */}
      {/* WordPress already handles its own optimization and caching */}
      {/* The WebView's native caching is sufficient for this use case */}
      {/*
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
      */}
      
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
        style={[styles.webview, { marginBottom: getBottomSpacing() }]}
      />
      
      {/* Navigation Footer Bar */}
      <View style={[styles.navigationFooter, { 
        bottom: Math.max(insets.bottom, 20) 
      }]}>
        <TouchableOpacity
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          onPress={handleGoBack}
          disabled={!canGoBack}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="arrow.left"
            size={22}
            color={canGoBack ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
          />
          <Text style={[styles.navButtonText, !canGoBack && styles.navButtonTextDisabled]}>
            Atrás
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleGoHome}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="house.fill"
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.navButtonText}>Inicio</Text>
        </TouchableOpacity>
      </View>
      
      {/* Footer Progress Bar - Non-blocking */}
      {showProgress && (
        <View style={[styles.footerProgressContainer, { 
          bottom: Math.max(insets.bottom + 60, 80) 
        }]}>
          <View style={styles.footerProgressTrack}>
            <Animated.View
              style={[
                styles.footerProgressBar,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          {isSlowConnection && (
            <Text style={styles.footerProgressText}>Conexión lenta...</Text>
          )}
        </View>
      )}
      
      {/* Cache Info (Debug) */}
      {__DEV__ && (
        <View style={[styles.debugInfo, { 
          bottom: showProgress 
            ? Math.max(insets.bottom + 100, 120) 
            : Math.max(insets.bottom + 60, 80) 
        }]}>
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
  footerProgressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: '#80b918',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  footerProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  footerProgressBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  footerProgressText: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 3,
    zIndex: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  navigationFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#80b918',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    opacity: 0.6,
  },
  navButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  navButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

