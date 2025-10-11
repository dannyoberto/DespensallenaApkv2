// WordPress/WooCommerce Specific Optimizations for Despensa Llena App

export const WORDPRESS_CONFIG = {
  // WordPress specific cache strategies
  cache: {
    // WordPress transients and object cache
    wpTransients: true,
    wpObjectCache: true,
    // WooCommerce specific caching
    wcProductCache: true,
    wcCategoryCache: true,
    wcCartCache: true,
    // Cache duration for different content types
    durations: {
      products: 30 * 60 * 1000, // 30 minutes
      categories: 60 * 60 * 1000, // 1 hour
      pages: 15 * 60 * 1000, // 15 minutes
      images: 24 * 60 * 60 * 1000, // 24 hours
    },
  },

  // WordPress API endpoints to preload
  apiEndpoints: {
    products: '/wp-json/wc/v3/products',
    categories: '/wp-json/wc/v3/products/categories',
    cart: '/wp-json/wc/store/v1/cart',
    checkout: '/wp-json/wc/store/v1/checkout',
    customer: '/wp-json/wc/store/v1/customers',
  },

  // WordPress specific resource optimization
  resources: {
    // Critical WordPress stylesheets
    stylesheets: [
      '/wp-content/themes/despensallena/style.css',
      '/wp-content/plugins/woocommerce/assets/css/woocommerce.css',
      '/wp-content/plugins/woocommerce/assets/css/woocommerce-smallscreen.css',
    ],
    // Critical WordPress JavaScript files
    scripts: [
      '/wp-includes/js/jquery/jquery.min.js',
      '/wp-content/plugins/woocommerce/assets/js/frontend/woocommerce.min.js',
      '/wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.min.js',
      '/wp-content/plugins/woocommerce/assets/js/frontend/add-to-cart.min.js',
    ],
    // WordPress admin bar optimization
    disableAdminBar: true,
    disableEmojiSupport: true,
    disableEmbedSupport: true,
  },

  // WooCommerce specific optimizations
  woocommerce: {
    // Product image optimization
    imageOptimization: {
      lazyLoading: true,
      webpSupport: true,
      responsiveImages: true,
      compression: 85, // Quality percentage
    },
    // Cart optimization
    cart: {
      localStorageSync: true,
      offlineSupport: true,
      autoSave: true,
    },
    // Checkout optimization
    checkout: {
      singlePageCheckout: true,
      guestCheckout: true,
      savePaymentMethods: true,
    },
  },

  // WordPress security and performance
  security: {
    // Disable unnecessary WordPress features
    disableFeatures: [
      'wp-json/wp/v2',
      'wp-json/oembed',
      'wp-json/contact-form-7',
      'xmlrpc.php',
      'readme.html',
    ],
    // Custom user agent for WordPress
    userAgent: 'DespensaLlenaApp/1.0 (WordPress Compatible)',
  },

  // WordPress database optimization
  database: {
    // Optimize WordPress queries
    optimizeQueries: true,
    // Limit post revisions
    limitRevisions: 3,
    // Optimize autoload options
    optimizeAutoload: true,
  },
};

// WordPress specific JavaScript injection for optimization
export const WORDPRESS_INJECTION_SCRIPT = `
(function() {
  // WordPress/WooCommerce optimization script
  
  // Disable WordPress admin bar for mobile app
  if (typeof wp !== 'undefined' && wp.customize) {
    document.body.classList.add('wp-customizer-js');
  }
  
  // Optimize WooCommerce cart updates
  if (typeof wc_add_to_cart_params !== 'undefined') {
    wc_add_to_cart_params.cart_url = window.location.href;
    wc_add_to_cart_params.cart_redirect_after_add = 'no';
  }
  
  // Optimize WooCommerce checkout
  if (typeof wc_checkout_params !== 'undefined') {
    wc_checkout_params.is_checkout = window.location.href.indexOf('checkout') > -1;
    wc_checkout_params.checkout_url = window.location.href;
  }
  
  // Disable unnecessary WordPress features
  if (typeof wp !== 'undefined') {
    // Disable WordPress emoji support
    if (wp.emoji) {
      wp.emoji.disable();
    }
    
    // Disable WordPress embed support
    if (wp.embed) {
      wp.embed.disable();
    }
  }
  
  // Optimize WordPress admin bar
  var adminBar = document.getElementById('wpadminbar');
  if (adminBar) {
    adminBar.style.display = 'none';
  }
  
  // Optimize WordPress login/logout links for mobile app
  var loginLinks = document.querySelectorAll('a[href*="wp-login.php"]');
  loginLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      // Handle login in app context
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'wordpress_login',
        url: link.href
      }));
    });
  });
  
  // Optimize WooCommerce product images
  var productImages = document.querySelectorAll('.woocommerce-product-gallery img');
  productImages.forEach(function(img) {
    if (img.dataset.src) {
      img.src = img.dataset.src;
    }
  });
  
  // Optimize WooCommerce cart fragments
  if (typeof wc_cart_fragments_params !== 'undefined') {
    wc_cart_fragments_params.cart_hash_key = 'wc_cart_hash_' + wc_cart_fragments_params.cart_hash_key;
  }
  
  // Send WordPress optimization complete message
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'wordpress_optimization_complete',
    timestamp: Date.now()
  }));
})();
`;

// WordPress specific error handling
export const WORDPRESS_ERROR_HANDLERS = {
  // Handle WordPress maintenance mode
  maintenanceMode: (response: Response) => {
    return response.status === 503 && response.headers.get('X-WP-Maintenance-Mode');
  },
  
  // Handle WooCommerce API errors
  wcApiError: (response: Response) => {
    return response.status >= 400 && response.url.includes('/wp-json/wc/');
  },
  
  // Handle WordPress database errors
  dbError: (response: Response) => {
    return response.status === 500 && response.url.includes('wp-admin');
  },
};

// WordPress specific performance metrics
export const WORDPRESS_METRICS = {
  // Track WordPress specific performance
  wpLoadTime: 0,
  wcApiResponseTime: 0,
  wpQueryTime: 0,
  wpMemoryUsage: 0,
  
  // Track WooCommerce specific metrics
  wcCartUpdateTime: 0,
  wcCheckoutTime: 0,
  wcProductLoadTime: 0,
};
