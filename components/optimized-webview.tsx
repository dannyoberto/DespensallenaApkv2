import { WORDPRESS_INJECTION_SCRIPT } from '@/config/wordpress-optimizations';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleOAuth } from '@/hooks/use-google-oauth';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useWebViewCache } from '@/hooks/use-webview-cache';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, View } from 'react-native';
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
}

export const OptimizedWebView = forwardRef<OptimizedWebViewRef, OptimizedWebViewProps>(({ 
  source, 
  onLoadStart, 
  onLoadEnd, 
  onError,
  onNavigationStateChange 
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isGooglePage, setIsGooglePage] = useState(false);
  
  const colorScheme = useColorScheme();
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    goBack: () => {
      webViewRef.current?.goBack();
    },
  }));
  
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
    resetOAuthState,
  } = useGoogleOAuth();

  // Critical resources to preload - WordPress/WooCommerce optimized
  const criticalResources = [
    'https://despensallena.com/favicon.ico',
    'https://despensallena.com/assets/css/main.css',
    'https://despensallena.com/assets/js/main.js',
    // WordPress/WooCommerce specific resources
    'https://despensallena.com/wp-content/themes/despensallena/style.css',
    'https://despensallena.com/wp-content/plugins/woocommerce/assets/css/woocommerce.css',
    'https://despensallena.com/wp-content/plugins/woocommerce/assets/js/frontend/woocommerce.min.js',
    'https://despensallena.com/wp-includes/js/jquery/jquery.min.js',
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
    // Only set loading if it's not already set (to avoid overriding click detection)
    setLoading(true);
    setShowProgress(true);
    setProgress(0);
    setHasError(false);
    
    // Check if we're navigating to a Google page
    const checkGooglePageScript = `
      (function() {
        var currentUrl = window.location.href;
        var isGoogle = currentUrl.includes('accounts.google.com') || 
                      currentUrl.includes('google.com') ||
                      currentUrl.includes('googleapis.com');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'page_check',
          isGooglePage: isGoogle,
          url: currentUrl
        }));
      })();
    `;
    
    // Delay the script injection slightly to ensure the page has started loading
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(checkGooglePageScript);
    }, 100);
    
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
    
    // Check if we're on a Google page using JavaScript
    const checkGooglePageScript = `
      (function() {
        var currentUrl = window.location.href;
        var isGoogle = currentUrl.includes('accounts.google.com') || 
                      currentUrl.includes('google.com') ||
                      currentUrl.includes('googleapis.com');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'page_check',
          isGooglePage: isGoogle,
          url: currentUrl
        }));
      })();
    `;
    
    webViewRef.current?.injectJavaScript(checkGooglePageScript);
    
    // Inject WordPress/WooCommerce optimization script
    const injectScript = WORDPRESS_INJECTION_SCRIPT + `
      (function() {
        // Intercept clicks on links to show loading immediately
        console.log('🔗 Setting up click interceptors for instant loading feedback');
        
        function setupClickInterceptors() {
          // Get all links on the page
          var links = document.querySelectorAll('a[href]');
          
          links.forEach(function(link) {
            // Skip if already has listener
            if (link.dataset.hasClickListener) return;
            
            link.addEventListener('click', function(e) {
              var href = link.getAttribute('href');
              
              // Check if it's an internal navigation (not external, not anchor, not javascript)
              if (href && 
                  !href.startsWith('#') && 
                  !href.startsWith('javascript:') &&
                  !href.startsWith('mailto:') &&
                  !href.startsWith('tel:') &&
                  !link.target === '_blank') {
                
                // Don't intercept Google OAuth links (Google shows its own progress)
                var isGoogleAuth = href.includes('accounts.google.com') || 
                                   href.includes('google.com/oauth') ||
                                   href.includes('loginSocial=google');
                
                if (!isGoogleAuth) {
                  console.log('🖱️ Link clicked, showing loading immediately:', href);
                  
                  // Notify React Native to show loading spinner immediately
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'link_clicked',
                    url: href,
                    timestamp: Date.now()
                  }));
                }
              }
            }, true); // Use capture phase to catch it early
            
            link.dataset.hasClickListener = 'true';
          });
          
          // Also intercept product links, buttons and WooCommerce elements
          var productElements = document.querySelectorAll(
            '.product a, ' +
            '.woocommerce-loop-product__link, ' +
            '.products a, ' +
            'button[name="add-to-cart"], ' +
            '.single_add_to_cart_button, ' +
            '.woocommerce-cart-form button[type="submit"], ' +
            '.checkout-button, ' +
            '.button.product_type_simple, ' +
            '.button.product_type_variable'
          );
          
          productElements.forEach(function(element) {
            if (element.dataset.hasClickListener) return;
            
            element.addEventListener('click', function(e) {
              // Check if it's a button or link that will cause navigation
              var willNavigate = element.tagName === 'A' || 
                                element.classList.contains('single_add_to_cart_button') ||
                                element.classList.contains('checkout-button');
              
              if (willNavigate) {
                var href = element.getAttribute('href') || window.location.href;
                console.log('🛒 Product/Commerce element clicked, showing loading:', element.className);
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'link_clicked',
                  url: href,
                  element: element.className,
                  timestamp: Date.now()
                }));
              }
            }, true);
            
            element.dataset.hasClickListener = 'true';
          });
        }
        
        // Initial setup
        setupClickInterceptors();
        
        // Re-setup when DOM changes (for dynamically loaded content)
        var observer = new MutationObserver(function(mutations) {
          setupClickInterceptors();
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Add CSS to handle safe areas for mobile navigation
        var safeAreaCSS = \`
          /* Safe area adjustments for mobile navigation */
          @supports (padding: max(0px)) {
            .mobile-navigation, 
            .bottom-navigation,
            .footer-navigation,
            nav[role="navigation"],
            .navbar-bottom,
            .bottom-nav,
            .mobile-menu,
            .fixed-bottom {
              padding-bottom: max(env(safe-area-inset-bottom), 20px) !important;
            }
            
            /* Ensure content doesn't overlap with system buttons */
            body {
              padding-bottom: env(safe-area-inset-bottom) !important;
            }
            
            /* Adjust any fixed bottom elements */
            .fixed-bottom,
            .sticky-bottom,
            .bottom-fixed {
              bottom: env(safe-area-inset-bottom) !important;
            }
          }
          
          /* Fallback for devices without safe area support */
          @media screen and (max-width: 768px) {
            .mobile-navigation, 
            .bottom-navigation,
            .footer-navigation,
            nav[role="navigation"],
            .navbar-bottom,
            .bottom-nav,
            .mobile-menu,
            .fixed-bottom {
              padding-bottom: 60px !important;
            }
            
            body {
              padding-bottom: 60px !important;
            }
          }
        \`;
        
        // Inject the CSS
        var style = document.createElement('style');
        style.textContent = safeAreaCSS;
        document.head.appendChild(style);
        
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
          
          // Optimize WooCommerce product images
          var productImages = document.querySelectorAll('.woocommerce-product-gallery img, .wp-post-image');
          productImages.forEach(function(img) {
            if (img.dataset.src) {
              img.src = img.dataset.src;
            }
            // Add loading optimization
            img.loading = 'lazy';
          });
          
          // Optimize WooCommerce cart updates
          if (typeof wc_add_to_cart_params !== 'undefined') {
            wc_add_to_cart_params.cart_redirect_after_add = 'no';
          }
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
        
        // Detect when user clicks "Siguiente" button for final authentication
        setTimeout(function() {
          function addButtonListeners() {
            // Look for various button types that could be the "Next" button
            var selectors = [
              'button[type="submit"]',
              'input[type="submit"]',
              'button[data-primary-action]',
              'button[aria-label*="Next"]',
              'button[aria-label*="Siguiente"]'
            ];
            
            selectors.forEach(function(selector) {
              try {
                var buttons = document.querySelectorAll(selector);
                buttons.forEach(function(button) {
                  // Check if button text contains relevant keywords
                  var buttonText = button.textContent || button.innerText || '';
                  var currentUrl = window.location.href;
                  
                  // Only activate spinner if this is the final authentication step
                  // Check if we're on a password page or similar final step
                  var isFinalStep = currentUrl.includes('/pwd') || 
                                   currentUrl.includes('/password') ||
                                   currentUrl.includes('/signin/v2/pwd') ||
                                   (currentUrl.includes('accounts.google.com') && 
                                    !currentUrl.includes('/identifier') && 
                                    !currentUrl.includes('/select-account'));
                  
                  if (isFinalStep && (
                      buttonText.toLowerCase().includes('next') || 
                      buttonText.toLowerCase().includes('siguiente') ||
                      buttonText.toLowerCase().includes('continuar') ||
                      buttonText.toLowerCase().includes('continue') ||
                      button.type === 'submit' ||
                      button.getAttribute('data-primary-action'))) {
                    
                    console.log('Found final authentication button:', buttonText, currentUrl);
                    
                    // Remove any existing listeners to avoid duplicates
                    button.removeEventListener('click', handleAuthenticationClick);
                    button.addEventListener('click', handleAuthenticationClick);
                  }
                });
              } catch (e) {
                console.log('Selector error:', selector, e);
              }
            });
          }
          
          function handleAuthenticationClick(e) {
            console.log('Final authentication button clicked - Google will handle its own progress indicators');
            // Don't send authentication message - Google shows its own progress
            // Just log for debugging purposes
          }
          
          // Initial setup
          addButtonListeners();
          
          // Re-setup when URL changes (for dynamic content)
          var lastUrl = window.location.href;
          setInterval(function() {
            if (window.location.href !== lastUrl) {
              lastUrl = window.location.href;
              console.log('URL changed, re-setting up button listeners');
              setTimeout(addButtonListeners, 1000);
            }
          }, 1000);
          
        }, 2000);
        
        setInterval(function() {
          if (window.location.href !== originalLocation) {
            console.log('URL changed to:', window.location.href);
            var currentUrl = window.location.href;
            
            // Check if navigating to password page
            if (currentUrl.includes('/pwd') || 
                currentUrl.includes('/password') ||
                currentUrl.includes('/signin/v2/pwd')) {
              console.log('Navigating to password page - resetting authentication state');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'navigate_to_password',
                url: currentUrl
              }));
            }
            
            // Check for OAuth success
            if (currentUrl.includes('despensallena.com') && 
                (currentUrl.includes('code=') || currentUrl.includes('access_token='))) {
              console.log('OAuth success detected');
              // Send message to React Native
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'oauth_success',
                url: currentUrl
              }));
            }
            
            originalLocation = currentUrl;
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

  // Handle navigation state change
  const handleNavigationStateChange = useCallback((navState: any) => {
    console.log('Navigation state changed:', {
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      url: navState.url
    });
    
    // Notify parent component if callback is provided
    onNavigationStateChange?.(navState.canGoBack);
  }, [onNavigationStateChange]);

  // Handle message from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      // Handle link click - show loading immediately for instant feedback
      if (data.type === 'link_clicked') {
        console.log('🖱️ Link clicked detected, showing loading immediately:', data.url);
        setLoading(true);
        setShowProgress(true);
        setProgress(0);
      }
      
      // Handle start authentication message (disabled - Google shows its own progress)
      if (data.type === 'start_authentication') {
        console.log('🚀 Authentication button clicked - Google will handle progress indicators');
        // Don't start authentication spinner - Google has its own progress
      }
      
      // Handle OAuth success messages
      if (data.type === 'oauth_success') {
        console.log('✅ OAuth success detected:', data.url);
        handleOAuthSuccess();
      }
      
      // Handle navigation to password page
      if (data.type === 'navigate_to_password') {
        console.log('📝 Navigating to password page - resetting authentication state');
        // Reset authentication state when navigating to password page
        resetOAuthState();
      }
      
      // Handle page check to determine if we're on Google
      if (data.type === 'page_check') {
        console.log('🔍 Page check result:', data.isGooglePage, data.url);
        setIsGooglePage(data.isGooglePage);
      }
    } catch (error) {
      console.log('WebView message (non-JSON):', event.nativeEvent.data);
    }
  }, [startAuthentication, handleOAuthSuccess, resetOAuthState]);

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
    onNavigationStateChange: handleNavigationStateChange,
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
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
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
      
      {loading && !isGooglePage && (
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
        style={[styles.webview, { marginBottom: insets.bottom }]}
      />
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
