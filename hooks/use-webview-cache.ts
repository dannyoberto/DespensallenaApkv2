import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface CacheConfig {
  enabled: boolean;
  maxAge: number; // in milliseconds
  maxSize: number; // in MB
}

interface WebViewCacheHook {
  cacheConfig: CacheConfig;
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  isCacheEnabled: boolean;
  preloadResources: (urls: string[]) => Promise<void>;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100, // 100 MB
};

export function useWebViewCache(): WebViewCacheHook {
  const [cacheConfig, setCacheConfig] = useState<CacheConfig>(DEFAULT_CACHE_CONFIG);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number; size: number }>>(new Map());

  // Clear cache function
  const clearCache = useCallback(async () => {
    try {
      cacheRef.current.clear();
      
      // Clear WebView cache if available
      if (Platform.OS === 'android') {
        // Android specific cache clearing
        console.log('Clearing Android WebView cache');
      } else if (Platform.OS === 'ios') {
        // iOS specific cache clearing
        console.log('Clearing iOS WebView cache');
      }
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, []);

  // Get cache size
  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      let totalSize = 0;
      cacheRef.current.forEach((item) => {
        totalSize += item.size;
      });
      
      // Convert bytes to MB
      return totalSize / (1024 * 1024);
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }, []);

  // Preload resources (legacy method for backward compatibility)
  const preloadResources = useCallback(async (urls: string[]): Promise<void> => {
    if (!cacheConfig.enabled) return;

    try {
      const preloadPromises = urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Cache-Control': 'max-age=3600', // 1 hour
            },
          });
          
          if (response.ok) {
            const data = await response.text();
            const size = new Blob([data]).size;
            
            cacheRef.current.set(url, {
              data,
              timestamp: Date.now(),
              size,
            });
            
            console.log(`Preloaded resource: ${url}`);
          }
        } catch (error) {
          console.warn(`Failed to preload ${url}:`, error);
        }
      });

      await Promise.allSettled(preloadPromises);
      console.log(`Preloaded ${urls.length} resources`);
    } catch (error) {
      console.error('Error preloading resources:', error);
    }
  }, [cacheConfig.enabled]);

  // Cleanup old cache entries
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (!cacheConfig.enabled) return;

      const now = Date.now();
      const entriesToDelete: string[] = [];

      cacheRef.current.forEach((item, key) => {
        // Remove entries older than maxAge
        if (now - item.timestamp > cacheConfig.maxAge) {
          entriesToDelete.push(key);
        }
      });

      entriesToDelete.forEach((key) => {
        cacheRef.current.delete(key);
      });

      if (entriesToDelete.length > 0) {
        console.log(`Cleaned up ${entriesToDelete.length} expired cache entries`);
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(cleanupInterval);
  }, [cacheConfig.enabled, cacheConfig.maxAge]);

  // Monitor cache size
  useEffect(() => {
    const monitorInterval = setInterval(async () => {
      const currentSize = await getCacheSize();
      
      if (currentSize > cacheConfig.maxSize) {
        console.log(`Cache size (${currentSize.toFixed(2)}MB) exceeds limit (${cacheConfig.maxSize}MB)`);
        // Clear oldest entries
        const entries = Array.from(cacheRef.current.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        let sizeToRemove = currentSize - cacheConfig.maxSize;
        for (const [key, item] of entries) {
          if (sizeToRemove <= 0) break;
          cacheRef.current.delete(key);
          sizeToRemove -= item.size / (1024 * 1024);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(monitorInterval);
  }, [cacheConfig.maxSize, getCacheSize]);

  return {
    cacheConfig,
    clearCache,
    getCacheSize,
    isCacheEnabled: cacheConfig.enabled,
    preloadResources,
  };
}
