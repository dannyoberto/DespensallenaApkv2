// WebView Configuration for Optimal Performance
export const WEBVIEW_CONFIG = {
  // Cache settings
  cache: {
    enabled: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxSize: 100, // 100 MB
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },
  
  // Preload settings
  preload: {
    enabled: true,
    criticalResources: [
      'https://despensallena.com/favicon.ico',
      'https://despensallena.com/assets/css/main.css',
      'https://despensallena.com/assets/js/main.js',
      'https://despensallena.com/assets/images/logo.png',
    ],
    timeout: 10000, // 10 seconds
  },
  
  // Network settings
  network: {
    retryAttempts: 3,
    retryDelay: 2000, // 2 seconds
    timeout: 30000, // 30 seconds
    slowConnectionThreshold: 1000, // 1 second
  },
  
  // Performance settings
  performance: {
    hardwareAcceleration: true,
    renderToHardwareTexture: true,
    androidLayerType: 'hardware',
    decelerationRate: 'normal',
    bounces: false,
    scrollEnabled: true,
  },
  
  // Security settings
  security: {
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    thirdPartyCookiesEnabled: true,
    mixedContentMode: 'compatibility',
  },
  
  // User experience settings
  ux: {
    showProgressBar: true,
    showNetworkStatus: true,
    showRetryButton: true,
    showCacheInfo: false, // For debugging
  },
};

// Critical resources for preloading
export const CRITICAL_RESOURCES = [
  'https://despensallena.com/favicon.ico',
  'https://despensallena.com/assets/css/main.css',
  'https://despensallena.com/assets/js/main.js',
  'https://despensallena.com/assets/images/logo.png',
  'https://despensallena.com/assets/images/hero-bg.jpg',
];

// Cache strategies
export const CACHE_STRATEGIES = {
  // Cache first, then network
  CACHE_FIRST: 'cache-first',
  // Network first, then cache
  NETWORK_FIRST: 'network-first',
  // Cache only
  CACHE_ONLY: 'cache-only',
  // Network only
  NETWORK_ONLY: 'network-only',
} as const;

// Performance monitoring
export const PERFORMANCE_METRICS = {
  loadTime: 0,
  cacheHitRate: 0,
  networkRequests: 0,
  errors: 0,
  retries: 0,
};
