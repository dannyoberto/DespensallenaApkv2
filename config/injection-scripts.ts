/**
 * Modular Injection Scripts for WebView Optimization
 * Separated into smaller, focused modules for better performance
 */

// Safe Area Adjustments for Mobile
export const SAFE_AREA_SCRIPT = `
(function() {
  'use strict';
  
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
      
      body {
        padding-bottom: env(safe-area-inset-bottom) !important;
      }
      
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
  
  var style = document.createElement('style');
  style.textContent = safeAreaCSS;
  document.head.appendChild(style);
})();
`;

// Click Interceptors for Instant Loading Feedback
export const CLICK_INTERCEPTOR_SCRIPT = `
(function() {
  'use strict';
  
  var setupClickInterceptors = function() {
    var links = document.querySelectorAll('a[href]');
    
    links.forEach(function(link) {
      if (link.dataset.hasClickListener) return;
      
      link.addEventListener('click', function(e) {
        var href = link.getAttribute('href');
        
        if (href && 
            !href.startsWith('#') && 
            !href.startsWith('javascript:') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            link.target !== '_blank') {
          
          var isGoogleAuth = href.includes('accounts.google.com') || 
                             href.includes('google.com/oauth') ||
                             href.includes('loginSocial=google');
          
          if (!isGoogleAuth) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'link_clicked',
              url: href,
              timestamp: Date.now()
            }));
          }
        }
      }, true);
      
      link.dataset.hasClickListener = 'true';
    });
    
    // WooCommerce specific elements
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
        var willNavigate = element.tagName === 'A' || 
                          element.classList.contains('single_add_to_cart_button') ||
                          element.classList.contains('checkout-button');
        
        if (willNavigate) {
          var href = element.getAttribute('href') || window.location.href;
          
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
  };
  
  // Initial setup
  setupClickInterceptors();
  
  // Re-setup when DOM changes
  var observer = new MutationObserver(function() {
    setupClickInterceptors();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
`;

// Google OAuth Visibility Fix
export const GOOGLE_OAUTH_SCRIPT = `
(function() {
  'use strict';
  
  var ensureGoogleButtonsVisible = function() {
    var googleButtons = document.querySelectorAll(
      'a[href*="google"], ' +
      'a[data-provider="google"], ' +
      'a[href*="loginSocial=google"]'
    );
    
    googleButtons.forEach(function(button) {
      button.style.display = 'block';
      button.style.visibility = 'visible';
      button.style.opacity = '1';
      
      if (!button.dataset.hasOAuthListener) {
        button.addEventListener('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'google_oauth_start',
            url: button.href
          }));
        });
        button.dataset.hasOAuthListener = 'true';
      }
    });
  };
  
  // Initial check
  setTimeout(ensureGoogleButtonsVisible, 1000);
  
  // Additional check after 3 seconds
  setTimeout(ensureGoogleButtonsVisible, 3000);
  
  // Monitor for OAuth redirects
  var checkOAuthSuccess = function() {
    var currentUrl = window.location.href;
    
    if (currentUrl.includes('despensallena.com') && 
        (currentUrl.includes('code=') || currentUrl.includes('access_token='))) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'oauth_success',
        url: currentUrl
      }));
    }
  };
  
  setInterval(checkOAuthSuccess, 1000);
})();
`;

// WooCommerce Optimizations
export const WOOCOMMERCE_OPTIMIZATION_SCRIPT = `
(function() {
  'use strict';
  
  // Optimize WooCommerce cart updates
  if (typeof wc_add_to_cart_params !== 'undefined') {
    wc_add_to_cart_params.cart_redirect_after_add = 'no';
  }
  
  // Optimize WooCommerce product images
  var productImages = document.querySelectorAll('.woocommerce-product-gallery img, .wp-post-image');
  productImages.forEach(function(img) {
    if (img.dataset.src && !img.src) {
      img.src = img.dataset.src;
    }
    img.loading = 'lazy';
  });
  
  // Optimize WooCommerce cart fragments
  if (typeof wc_cart_fragments_params !== 'undefined') {
    wc_cart_fragments_params.cart_hash_key = 'wc_cart_hash_' + wc_cart_fragments_params.cart_hash_key;
  }
  
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'woocommerce_optimization_complete',
    timestamp: Date.now()
  }));
})();
`;

// WebView Detection Prevention
export const WEBVIEW_DETECTION_PREVENTION_SCRIPT = `
(function() {
  'use strict';
  
  // Hide WebView indicators
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage = window.ReactNativeWebView.postMessage || function() {};
  }
  
  // Override navigator properties to avoid detection
  Object.defineProperty(navigator, 'webdriver', {
    get: function() { return undefined; }
  });
  
  // Hide WebView-specific properties
  delete window.__REACT_WEB_VIEW_BRIDGE;
  delete window.ReactNativeWebView;
  
  // Override user agent if needed
  Object.defineProperty(navigator, 'userAgent', {
    get: function() {
      return 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
    }
  });
  
  // Add Chrome-specific properties
  if (!window.chrome) {
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
  }
})();
`;

// WordPress Admin Bar Removal
export const WORDPRESS_CLEANUP_SCRIPT = `
(function() {
  'use strict';
  
  // Disable WordPress admin bar
  var adminBar = document.getElementById('wpadminbar');
  if (adminBar) {
    adminBar.style.display = 'none';
  }
  
  // Disable WordPress emoji support
  if (typeof wp !== 'undefined' && wp.emoji) {
    wp.emoji.disable();
  }
  
  // Disable WordPress embed support
  if (typeof wp !== 'undefined' && wp.embed) {
    wp.embed.disable();
  }
})();
`;

// Page Check Script
export const PAGE_CHECK_SCRIPT = `
(function() {
  'use strict';
  
  var checkGooglePage = function() {
    var currentUrl = window.location.href;
    var isGooglePage = currentUrl.includes('accounts.google.com') || 
                      currentUrl.includes('google.com') ||
                      currentUrl.includes('googleapis.com') ||
                      currentUrl.includes('gstatic.com');
    
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'page_check',
      isGooglePage: isGooglePage,
      url: currentUrl
    }));
  };
  
  // Initial check
  checkGooglePage();
  
  // Check on URL changes (for SPA navigation)
  var lastUrl = window.location.href;
  setInterval(function() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      checkGooglePage();
    }
  }, 500);
  
  // Also check on popstate events
  window.addEventListener('popstate', checkGooglePage);
  window.addEventListener('pushstate', checkGooglePage);
  window.addEventListener('replacestate', checkGooglePage);
})();
`;

// Combined base script for initial injection
export const BASE_INJECTION_SCRIPT = `
${WEBVIEW_DETECTION_PREVENTION_SCRIPT}
${SAFE_AREA_SCRIPT}
${WORDPRESS_CLEANUP_SCRIPT}
${PAGE_CHECK_SCRIPT}
`;

// Combined interactive script for after page load
export const INTERACTIVE_INJECTION_SCRIPT = `
${CLICK_INTERCEPTOR_SCRIPT}
${GOOGLE_OAUTH_SCRIPT}
${WOOCOMMERCE_OPTIMIZATION_SCRIPT}
`;

// Full combined script (for backward compatibility)
export const FULL_INJECTION_SCRIPT = `
${BASE_INJECTION_SCRIPT}
${INTERACTIVE_INJECTION_SCRIPT}
`;

// Script builder for conditional injection
export interface ScriptOptions {
  webViewDetectionPrevention?: boolean;
  safeArea?: boolean;
  clickInterceptor?: boolean;
  googleOAuth?: boolean;
  wooCommerce?: boolean;
  wordPressCleanup?: boolean;
  pageCheck?: boolean;
}

export function buildInjectionScript(options: ScriptOptions = {}): string {
  const {
    webViewDetectionPrevention = true,
    safeArea = true,
    clickInterceptor = true,
    googleOAuth = true,
    wooCommerce = true,
    wordPressCleanup = true,
    pageCheck = true,
  } = options;

  let script = '';
  
  if (webViewDetectionPrevention) script += WEBVIEW_DETECTION_PREVENTION_SCRIPT;
  if (safeArea) script += SAFE_AREA_SCRIPT;
  if (wordPressCleanup) script += WORDPRESS_CLEANUP_SCRIPT;
  if (pageCheck) script += PAGE_CHECK_SCRIPT;
  if (clickInterceptor) script += CLICK_INTERCEPTOR_SCRIPT;
  if (googleOAuth) script += GOOGLE_OAUTH_SCRIPT;
  if (wooCommerce) script += WOOCOMMERCE_OPTIMIZATION_SCRIPT;

  return script;
}

// Lazy injection helper
export function injectScriptLazy(
  webViewRef: any,
  script: string,
  delay: number = 100
): void {
  setTimeout(() => {
    webViewRef.current?.injectJavaScript(script);
  }, delay);
}

