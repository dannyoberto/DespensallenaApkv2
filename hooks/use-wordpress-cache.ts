import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface WordPressCacheConfig {
  enabled: boolean;
  wpTransients: boolean;
  wcProductCache: boolean;
  wcCategoryCache: boolean;
  wpObjectCache: boolean;
  maxAge: number;
  maxSize: number; // in MB
}

interface WordPressCacheHook {
  cacheConfig: WordPressCacheConfig;
  clearWordPressCache: () => Promise<void>;
  getWordPressCacheSize: () => Promise<number>;
  isWordPressCacheEnabled: boolean;
  preloadWordPressResources: (urls: string[]) => Promise<void>;
  cacheWordPressData: (key: string, data: any, type: 'product' | 'category' | 'page' | 'api') => Promise<void>;
  getWordPressData: (key: string, type: 'product' | 'category' | 'page' | 'api') => Promise<any>;
}

const DEFAULT_WORDPRESS_CACHE_CONFIG: WordPressCacheConfig = {
  enabled: true,
  wpTransients: true,
  wcProductCache: true,
  wcCategoryCache: true,
  wpObjectCache: true,
  maxAge: 30 * 60 * 1000, // 30 minutes for WordPress data
  maxSize: 150, // 150 MB for WordPress cache
};

// Cache duration by content type
const CACHE_DURATIONS = {
  product: 30 * 60 * 1000, // 30 minutes
  category: 60 * 60 * 1000, // 1 hour
  page: 15 * 60 * 1000, // 15 minutes
  api: 10 * 60 * 1000, // 10 minutes
};

export function useWordPressCache(): WordPressCacheHook {
  const [cacheConfig, setCacheConfig] = useState<WordPressCacheConfig>(DEFAULT_WORDPRESS_CACHE_CONFIG);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number; size: number; type: string }>>(new Map());

  // Clear WordPress specific cache
  const clearWordPressCache = useCallback(async () => {
    try {
      // Clear WordPress specific cache entries
      const entriesToDelete: string[] = [];
      cacheRef.current.forEach((item, key) => {
        if (key.includes('wp-') || key.includes('wc-') || key.includes('woocommerce')) {
          entriesToDelete.push(key);
        }
      });

      entriesToDelete.forEach((key) => {
        cacheRef.current.delete(key);
      });

      // Clear WebView cache if available
      if (Platform.OS === 'android') {
        console.log('Clearing WordPress Android WebView cache');
      } else if (Platform.OS === 'ios') {
        console.log('Clearing WordPress iOS WebView cache');
      }

      console.log(`Cleared ${entriesToDelete.length} WordPress cache entries`);
    } catch (error) {
      console.error('Error clearing WordPress cache:', error);
    }
  }, []);

  // Get WordPress cache size
  const getWordPressCacheSize = useCallback(async (): Promise<number> => {
    try {
      let totalSize = 0;
      cacheRef.current.forEach((item, key) => {
        if (key.includes('wp-') || key.includes('wc-') || key.includes('woocommerce')) {
          totalSize += item.size;
        }
      });

      // Convert bytes to MB
      return totalSize / (1024 * 1024);
    } catch (error) {
      console.error('Error getting WordPress cache size:', error);
      return 0;
    }
  }, []);

  // Preload WordPress specific resources
  const preloadWordPressResources = useCallback(async (urls: string[]): Promise<void> => {
    if (!cacheConfig.enabled) return;

    try {
      const preloadPromises = urls.map(async (url) => {
        try {
          // WordPress specific headers
          const headers: Record<string, string> = {
            'Cache-Control': 'max-age=3600',
            'User-Agent': 'DespensaLlenaApp/1.0 (WordPress Compatible)',
          };

          // Add WordPress specific headers for API endpoints
          if (url.includes('/wp-json/') || url.includes('/wc-api/')) {
            headers['Accept'] = 'application/json';
            headers['Content-Type'] = 'application/json';
          }

          const response = await fetch(url, {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            let data: any;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              data = await response.json();
            } else {
              data = await response.text();
            }

            const size = new Blob([JSON.stringify(data)]).size;
            
            // Create WordPress specific cache key
            const cacheKey = `wp-preload-${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            cacheRef.current.set(cacheKey, {
              data,
              timestamp: Date.now(),
              size,
              type: url.includes('/wp-json/') ? 'api' : 'resource',
            });

            console.log(`Preloaded WordPress resource: ${url}`);
          }
        } catch (error) {
          console.warn(`Failed to preload WordPress resource ${url}:`, error);
        }
      });

      await Promise.allSettled(preloadPromises);
      console.log(`Preloaded ${urls.length} WordPress resources`);
    } catch (error) {
      console.error('Error preloading WordPress resources:', error);
    }
  }, [cacheConfig.enabled]);

  // Cache WordPress specific data
  const cacheWordPressData = useCallback(async (key: string, data: any, type: 'product' | 'category' | 'page' | 'api'): Promise<void> => {
    if (!cacheConfig.enabled) return;

    try {
      const cacheKey = `wp-${type}-${key}`;
      const size = new Blob([JSON.stringify(data)]).size;
      
      cacheRef.current.set(cacheKey, {
        data,
        timestamp: Date.now(),
        size,
        type,
      });

      console.log(`Cached WordPress ${type} data: ${key}`);
    } catch (error) {
      console.error(`Error caching WordPress ${type} data:`, error);
    }
  }, [cacheConfig.enabled]);

  // Get WordPress cached data
  const getWordPressData = useCallback(async (key: string, type: 'product' | 'category' | 'page' | 'api'): Promise<any> => {
    if (!cacheConfig.enabled) return null;

    try {
      const cacheKey = `wp-${type}-${key}`;
      const cachedItem = cacheRef.current.get(cacheKey);

      if (!cachedItem) {
        console.log(`WordPress ${type} data not found in cache: ${key}`);
        return null;
      }

      // Check if cache is expired
      const maxAge = CACHE_DURATIONS[type];
      if (Date.now() - cachedItem.timestamp > maxAge) {
        console.log(`WordPress ${type} cache expired: ${key}`);
        cacheRef.current.delete(cacheKey);
        return null;
      }

      console.log(`Retrieved WordPress ${type} data from cache: ${key}`);
      return cachedItem.data;
    } catch (error) {
      console.error(`Error retrieving WordPress ${type} data:`, error);
      return null;
    }
  }, [cacheConfig.enabled]);

  // Cleanup expired WordPress cache entries
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (!cacheConfig.enabled) return;

      const now = Date.now();
      const entriesToDelete: string[] = [];

      cacheRef.current.forEach((item, key) => {
        if (key.includes('wp-') || key.includes('wc-') || key.includes('woocommerce')) {
          // Get cache duration based on type
          const duration = CACHE_DURATIONS[item.type as keyof typeof CACHE_DURATIONS] || cacheConfig.maxAge;
          
          // Remove expired entries
          if (now - item.timestamp > duration) {
            entriesToDelete.push(key);
          }
        }
      });

      entriesToDelete.forEach((key) => {
        cacheRef.current.delete(key);
      });

      if (entriesToDelete.length > 0) {
        console.log(`Cleaned up ${entriesToDelete.length} expired WordPress cache entries`);
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(cleanupInterval);
  }, [cacheConfig.enabled, cacheConfig.maxAge]);

  // Monitor WordPress cache size
  useEffect(() => {
    const monitorInterval = setInterval(async () => {
      const currentSize = await getWordPressCacheSize();
      
      if (currentSize > cacheConfig.maxSize) {
        console.log(`WordPress cache size (${currentSize.toFixed(2)}MB) exceeds limit (${cacheConfig.maxSize}MB)`);
        
        // Clear oldest WordPress entries
        const wpEntries = Array.from(cacheRef.current.entries())
          .filter(([key]) => key.includes('wp-') || key.includes('wc-') || key.includes('woocommerce'))
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        let sizeToRemove = currentSize - cacheConfig.maxSize;
        for (const [key, item] of wpEntries) {
          if (sizeToRemove <= 0) break;
          cacheRef.current.delete(key);
          sizeToRemove -= item.size / (1024 * 1024);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(monitorInterval);
  }, [cacheConfig.maxSize, getWordPressCacheSize]);

  return {
    cacheConfig,
    clearWordPressCache,
    getWordPressCacheSize,
    isWordPressCacheEnabled: cacheConfig.enabled,
    preloadWordPressResources,
    cacheWordPressData,
    getWordPressData,
  };
}
