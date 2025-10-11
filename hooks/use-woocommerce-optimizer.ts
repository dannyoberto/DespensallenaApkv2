import { useCallback, useEffect, useRef, useState } from 'react';
import { useWordPressCache } from './use-wordpress-cache';

interface WooCommerceConfig {
  enabled: boolean;
  apiBaseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version: string;
  timeout: number;
  retryAttempts: number;
}

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: any[];
  default_attributes: any[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

interface WooCommerceOptimizerHook {
  config: WooCommerceConfig;
  products: WooCommerceProduct[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  
  // Product operations
  getProducts: (params?: any) => Promise<WooCommerceProduct[]>;
  getProduct: (id: number) => Promise<WooCommerceProduct | null>;
  getProductsByCategory: (categoryId: number) => Promise<WooCommerceProduct[]>;
  searchProducts: (query: string) => Promise<WooCommerceProduct[]>;
  
  // Category operations
  getCategories: () => Promise<any[]>;
  getCategory: (id: number) => Promise<any | null>;
  
  // Cart operations
  addToCart: (productId: number, quantity: number) => Promise<boolean>;
  updateCart: (cartKey: string, quantity: number) => Promise<boolean>;
  removeFromCart: (cartKey: string) => Promise<boolean>;
  getCart: () => Promise<any>;
  clearCart: () => Promise<boolean>;
  
  // Cache operations
  clearWooCommerceCache: () => Promise<void>;
  preloadPopularProducts: () => Promise<void>;
  preloadCategories: () => Promise<void>;
}

const DEFAULT_WOOCOMMERCE_CONFIG: WooCommerceConfig = {
  enabled: true,
  apiBaseUrl: 'https://despensallena.com/wp-json/wc/v3',
  consumerKey: '', // Should be set via environment variables
  consumerSecret: '', // Should be set via environment variables
  version: 'v3',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

export function useWooCommerceOptimizer(): WooCommerceOptimizerHook {
  const [config, setConfig] = useState<WooCommerceConfig>(DEFAULT_WOOCOMMERCE_CONFIG);
  const [products, setProducts] = useState<WooCommerceProduct[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { cacheWordPressData, getWordPressData, preloadWordPressResources } = useWordPressCache();
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // Make authenticated API request
  const makeApiRequest = useCallback(async (endpoint: string, params: any = {}): Promise<any> => {
    try {
      const url = new URL(`${config.apiBaseUrl}${endpoint}`);
      
      // Add authentication parameters
      if (config.consumerKey && config.consumerSecret) {
        url.searchParams.append('consumer_key', config.consumerKey);
        url.searchParams.append('consumer_secret', config.consumerSecret);
      }
      
      // Add other parameters
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'DespensaLlenaApp/1.0 (WooCommerce Compatible)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }, [config]);

  // Retry mechanism
  const retryRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    requestKey: string,
    maxRetries: number = config.retryAttempts
  ): Promise<T> => {
    const currentRetries = retryCountRef.current.get(requestKey) || 0;
    
    if (currentRetries >= maxRetries) {
      retryCountRef.current.delete(requestKey);
      throw new Error(`Max retries (${maxRetries}) exceeded for ${requestKey}`);
    }

    try {
      const result = await requestFn();
      retryCountRef.current.delete(requestKey);
      return result;
    } catch (error) {
      retryCountRef.current.set(requestKey, currentRetries + 1);
      
      // Exponential backoff
      const delay = Math.pow(2, currentRetries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return retryRequest(requestFn, requestKey, maxRetries);
    }
  }, [config.retryAttempts]);

  // Get products with caching
  const getProducts = useCallback(async (params: any = {}): Promise<WooCommerceProduct[]> => {
    const cacheKey = `products_${JSON.stringify(params)}`;
    
    // Try to get from cache first
    const cachedData = await getWordPressData(cacheKey, 'product');
    if (cachedData) {
      console.log('Products loaded from cache');
      return cachedData;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestFn = () => makeApiRequest('/products', params);
      const productsData = await retryRequest(requestFn, `getProducts_${cacheKey}`);
      
      // Cache the results
      await cacheWordPressData(cacheKey, productsData, 'product');
      
      setProducts(productsData);
      console.log(`Loaded ${productsData.length} products from API`);
      return productsData;
    } catch (error: any) {
      setError(error.message);
      console.error('Error loading products:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [makeApiRequest, retryRequest, getWordPressData, cacheWordPressData]);

  // Get single product
  const getProduct = useCallback(async (id: number): Promise<WooCommerceProduct | null> => {
    const cacheKey = `product_${id}`;
    
    // Try to get from cache first
    const cachedData = await getWordPressData(cacheKey, 'product');
    if (cachedData) {
      console.log(`Product ${id} loaded from cache`);
      return cachedData;
    }

    try {
      const requestFn = () => makeApiRequest(`/products/${id}`);
      const productData = await retryRequest(requestFn, `getProduct_${id}`);
      
      // Cache the result
      await cacheWordPressData(cacheKey, productData, 'product');
      
      console.log(`Loaded product ${id} from API`);
      return productData;
    } catch (error: any) {
      console.error(`Error loading product ${id}:`, error);
      return null;
    }
  }, [makeApiRequest, retryRequest, getWordPressData, cacheWordPressData]);

  // Get products by category
  const getProductsByCategory = useCallback(async (categoryId: number): Promise<WooCommerceProduct[]> => {
    return getProducts({ category: categoryId });
  }, [getProducts]);

  // Search products
  const searchProducts = useCallback(async (query: string): Promise<WooCommerceProduct[]> => {
    return getProducts({ search: query });
  }, [getProducts]);

  // Get categories with caching
  const getCategories = useCallback(async (): Promise<any[]> => {
    const cacheKey = 'all_categories';
    
    // Try to get from cache first
    const cachedData = await getWordPressData(cacheKey, 'category');
    if (cachedData) {
      console.log('Categories loaded from cache');
      return cachedData;
    }

    try {
      const requestFn = () => makeApiRequest('/products/categories');
      const categoriesData = await retryRequest(requestFn, 'getCategories');
      
      // Cache the results
      await cacheWordPressData(cacheKey, categoriesData, 'category');
      
      setCategories(categoriesData);
      console.log(`Loaded ${categoriesData.length} categories from API`);
      return categoriesData;
    } catch (error: any) {
      console.error('Error loading categories:', error);
      return [];
    }
  }, [makeApiRequest, retryRequest, getWordPressData, cacheWordPressData]);

  // Get single category
  const getCategory = useCallback(async (id: number): Promise<any | null> => {
    const cacheKey = `category_${id}`;
    
    // Try to get from cache first
    const cachedData = await getWordPressData(cacheKey, 'category');
    if (cachedData) {
      console.log(`Category ${id} loaded from cache`);
      return cachedData;
    }

    try {
      const requestFn = () => makeApiRequest(`/products/categories/${id}`);
      const categoryData = await retryRequest(requestFn, `getCategory_${id}`);
      
      // Cache the result
      await cacheWordPressData(cacheKey, categoryData, 'category');
      
      console.log(`Loaded category ${id} from API`);
      return categoryData;
    } catch (error: any) {
      console.error(`Error loading category ${id}:`, error);
      return null;
    }
  }, [makeApiRequest, retryRequest, getWordPressData, cacheWordPressData]);

  // Cart operations (these would typically use WooCommerce Store API or custom endpoints)
  const addToCart = useCallback(async (productId: number, quantity: number): Promise<boolean> => {
    try {
      // This would typically make a POST request to the cart endpoint
      // For now, we'll simulate success
      console.log(`Adding ${quantity} of product ${productId} to cart`);
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  }, []);

  const updateCart = useCallback(async (cartKey: string, quantity: number): Promise<boolean> => {
    try {
      console.log(`Updating cart item ${cartKey} to quantity ${quantity}`);
      return true;
    } catch (error) {
      console.error('Error updating cart:', error);
      return false;
    }
  }, []);

  const removeFromCart = useCallback(async (cartKey: string): Promise<boolean> => {
    try {
      console.log(`Removing cart item ${cartKey}`);
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  }, []);

  const getCart = useCallback(async (): Promise<any> => {
    try {
      // This would typically fetch the current cart state
      console.log('Getting cart state');
      return {};
    } catch (error) {
      console.error('Error getting cart:', error);
      return {};
    }
  }, []);

  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Clearing cart');
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }, []);

  // Clear WooCommerce cache
  const clearWooCommerceCache = useCallback(async () => {
    try {
      // Clear product and category cache
      const { clearWordPressCache } = useWordPressCache();
      await clearWordPressCache();
      console.log('WooCommerce cache cleared');
    } catch (error) {
      console.error('Error clearing WooCommerce cache:', error);
    }
  }, []);

  // Preload popular products
  const preloadPopularProducts = useCallback(async () => {
    try {
      // Preload featured products
      await getProducts({ featured: true, per_page: 10 });
      
      // Preload best selling products
      await getProducts({ orderby: 'popularity', per_page: 10 });
      
      console.log('Popular products preloaded');
    } catch (error) {
      console.error('Error preloading popular products:', error);
    }
  }, [getProducts]);

  // Preload categories
  const preloadCategories = useCallback(async () => {
    try {
      await getCategories();
      console.log('Categories preloaded');
    } catch (error) {
      console.error('Error preloading categories:', error);
    }
  }, [getCategories]);

  // Initialize WooCommerce on mount
  useEffect(() => {
    if (config.enabled) {
      // Preload essential data
      preloadCategories();
      preloadPopularProducts();
    }
  }, [config.enabled, preloadCategories, preloadPopularProducts]);

  return {
    config,
    products,
    categories,
    isLoading,
    error,
    getProducts,
    getProduct,
    getProductsByCategory,
    searchProducts,
    getCategories,
    getCategory,
    addToCart,
    updateCart,
    removeFromCart,
    getCart,
    clearCart,
    clearWooCommerceCache,
    preloadPopularProducts,
    preloadCategories,
  };
}
