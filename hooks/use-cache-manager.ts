/**
 * Unified Cache Manager Hook
 * Consolidates all cache systems with persistent storage support
 */

import { cacheLogger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

// Cache entry interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  size: number;
  type: CacheType;
  expiresAt: number;
  hits: number;
}

// Cache types for different content
export type CacheType = 'html' | 'api' | 'product' | 'category' | 'image' | 'script' | 'style' | 'resource';

// Cache strategy types
export type CacheStrategy = 'cache-first' | 'network-first' | 'cache-only' | 'network-only' | 'stale-while-revalidate';

// Cache configuration
interface CacheConfig {
  enabled: boolean;
  maxSize: number; // MB
  maxEntries: number;
  defaultTTL: number; // milliseconds
  persistToDisk: boolean;
  useCompression: boolean;
}

// Cache TTL by type (in milliseconds)
const CACHE_TTL_BY_TYPE: Record<CacheType, number> = {
  html: 15 * 60 * 1000,        // 15 minutes
  api: 10 * 60 * 1000,         // 10 minutes
  product: 30 * 60 * 1000,     // 30 minutes
  category: 60 * 60 * 1000,    // 1 hour
  image: 24 * 60 * 60 * 1000,  // 24 hours
  script: 24 * 60 * 60 * 1000, // 24 hours
  style: 24 * 60 * 60 * 1000,  // 24 hours
  resource: 60 * 60 * 1000,    // 1 hour
};

// Default configuration
const DEFAULT_CONFIG: CacheConfig = {
  enabled: true,
  maxSize: 200, // 200 MB
  maxEntries: 1000,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  persistToDisk: true,
  useCompression: false,
};

// Storage keys
const STORAGE_KEYS = {
  PREFIX: '@despensallena_cache_',
  INDEX: '@despensallena_cache_index',
  CONFIG: '@despensallena_cache_config',
};

interface CacheManagerHook {
  // Core operations
  get: <T = any>(key: string, type?: CacheType) => Promise<T | null>;
  set: <T = any>(key: string, data: T, type?: CacheType, customTTL?: number) => Promise<boolean>;
  has: (key: string) => Promise<boolean>;
  remove: (key: string) => Promise<boolean>;
  clear: (type?: CacheType) => Promise<void>;
  
  // Batch operations
  getMultiple: <T = any>(keys: string[]) => Promise<Map<string, T>>;
  setMultiple: <T = any>(entries: Array<{ key: string; data: T; type?: CacheType }>) => Promise<boolean>;
  
  // Cache management
  prune: () => Promise<number>; // Remove expired entries
  optimize: () => Promise<void>; // Optimize cache (LRU eviction)
  
  // Statistics
  getStats: () => Promise<CacheStats>;
  getCacheSize: () => Promise<number>;
  
  // Configuration
  config: CacheConfig;
  updateConfig: (newConfig: Partial<CacheConfig>) => void;
  
  // State
  isReady: boolean;
  isLoading: boolean;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number; // in MB
  hitRate: number;
  byType: Record<CacheType, { count: number; size: number }>;
  oldestEntry: number;
  newestEntry: number;
}

export function useCacheManager(): CacheManagerHook {
  const [config, setConfig] = useState<CacheConfig>(DEFAULT_CONFIG);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // In-memory cache for fast access (LRU)
  const memoryCache = useRef<Map<string, CacheEntry>>(new Map());
  const cacheIndex = useRef<Set<string>>(new Set());
  const totalHits = useRef(0);
  const totalMisses = useRef(0);

  // Initialize cache from disk
  useEffect(() => {
    initializeCache();
  }, []);

  // Periodic cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      if (config.enabled) {
        const pruned = await prune();
        if (pruned > 0) {
          cacheLogger.info(`🧹 Pruned ${pruned} expired cache entries`);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [config.enabled]);

  // Initialize cache
  const initializeCache = useCallback(async () => {
    try {
      cacheLogger.info('🚀 Initializing cache manager...');
      
      // Load cache index
      const indexData = await AsyncStorage.getItem(STORAGE_KEYS.INDEX);
      if (indexData) {
        const index = JSON.parse(indexData) as string[];
        index.forEach(key => cacheIndex.current.add(key));
        cacheLogger.info(`📚 Loaded ${index.length} entries from cache index`);
      }

      // Load configuration
      const configData = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
      if (configData) {
        const savedConfig = JSON.parse(configData) as CacheConfig;
        setConfig({ ...DEFAULT_CONFIG, ...savedConfig });
      }

      setIsReady(true);
      cacheLogger.info('✅ Cache manager ready');
    } catch (error) {
      cacheLogger.error('❌ Failed to initialize cache:', error);
      setIsReady(true); // Continue without cache
    }
  }, []);

  // Generate storage key
  const getStorageKey = useCallback((key: string): string => {
    return `${STORAGE_KEYS.PREFIX}${key}`;
  }, []);

  // Calculate data size
  const calculateSize = useCallback((data: any): number => {
    try {
      const str = JSON.stringify(data);
      return new Blob([str]).size;
    } catch {
      return 0;
    }
  }, []);

  // Get from cache
  const get = useCallback(async <T = any>(key: string, type?: CacheType): Promise<T | null> => {
    if (!config.enabled) return null;

    try {
      // Check memory cache first
      if (memoryCache.current.has(key)) {
        const entry = memoryCache.current.get(key)!;
        
        // Check if expired
        if (Date.now() > entry.expiresAt) {
          cacheLogger.debug(`⏰ Cache expired: ${key}`);
          await remove(key);
          totalMisses.current++;
          return null;
        }

        // Update hits
        entry.hits++;
        totalHits.current++;
        cacheLogger.debug(`✅ Cache hit (memory): ${key}`);
        return entry.data as T;
      }

      // Check disk cache
      if (config.persistToDisk && cacheIndex.current.has(key)) {
        const storageKey = getStorageKey(key);
        const entryData = await AsyncStorage.getItem(storageKey);
        
        if (entryData) {
          const entry = JSON.parse(entryData) as CacheEntry<T>;
          
          // Check if expired
          if (Date.now() > entry.expiresAt) {
            cacheLogger.debug(`⏰ Cache expired (disk): ${key}`);
            await remove(key);
            totalMisses.current++;
            return null;
          }

          // Load into memory cache
          memoryCache.current.set(key, entry);
          entry.hits++;
          totalHits.current++;
          
          cacheLogger.debug(`✅ Cache hit (disk): ${key}`);
          return entry.data;
        }
      }

      totalMisses.current++;
      cacheLogger.debug(`❌ Cache miss: ${key}`);
      return null;
    } catch (error) {
      cacheLogger.error(`Error getting cache entry ${key}:`, error);
      return null;
    }
  }, [config.enabled, config.persistToDisk, getStorageKey]);

  // Set to cache
  const set = useCallback(async <T = any>(
    key: string,
    data: T,
    type: CacheType = 'resource',
    customTTL?: number
  ): Promise<boolean> => {
    if (!config.enabled) return false;

    try {
      const size = calculateSize(data);
      const ttl = customTTL || CACHE_TTL_BY_TYPE[type] || config.defaultTTL;
      const now = Date.now();

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        size,
        type,
        expiresAt: now + ttl,
        hits: 0,
      };

      // Add to memory cache
      memoryCache.current.set(key, entry);
      cacheIndex.current.add(key);

      // Persist to disk if enabled
      if (config.persistToDisk) {
        const storageKey = getStorageKey(key);
        await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
        
        // Update index
        await AsyncStorage.setItem(
          STORAGE_KEYS.INDEX,
          JSON.stringify(Array.from(cacheIndex.current))
        );
      }

      cacheLogger.debug(`💾 Cached: ${key} (${(size / 1024).toFixed(2)}KB, TTL: ${(ttl / 1000).toFixed(0)}s)`);

      // Check if we need to optimize
      if (memoryCache.current.size > config.maxEntries) {
        await optimize();
      }

      return true;
    } catch (error) {
      cacheLogger.error(`Error setting cache entry ${key}:`, error);
      return false;
    }
  }, [config.enabled, config.persistToDisk, config.defaultTTL, config.maxEntries, calculateSize, getStorageKey]);

  // Check if key exists
  const has = useCallback(async (key: string): Promise<boolean> => {
    return memoryCache.current.has(key) || cacheIndex.current.has(key);
  }, []);

  // Remove from cache
  const remove = useCallback(async (key: string): Promise<boolean> => {
    try {
      memoryCache.current.delete(key);
      cacheIndex.current.delete(key);

      if (config.persistToDisk) {
        const storageKey = getStorageKey(key);
        await AsyncStorage.removeItem(storageKey);
        await AsyncStorage.setItem(
          STORAGE_KEYS.INDEX,
          JSON.stringify(Array.from(cacheIndex.current))
        );
      }

      cacheLogger.debug(`🗑️ Removed from cache: ${key}`);
      return true;
    } catch (error) {
      cacheLogger.error(`Error removing cache entry ${key}:`, error);
      return false;
    }
  }, [config.persistToDisk, getStorageKey]);

  // Clear cache (all or by type)
  const clear = useCallback(async (type?: CacheType): Promise<void> => {
    try {
      if (type) {
        // Clear specific type
        const keysToRemove: string[] = [];
        memoryCache.current.forEach((entry, key) => {
          if (entry.type === type) {
            keysToRemove.push(key);
          }
        });

        for (const key of keysToRemove) {
          await remove(key);
        }

        cacheLogger.info(`🧹 Cleared ${keysToRemove.length} entries of type ${type}`);
      } else {
        // Clear all
        memoryCache.current.clear();
        
        if (config.persistToDisk) {
          const keys = await AsyncStorage.getAllKeys();
          const cacheKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.PREFIX));
          await AsyncStorage.multiRemove(cacheKeys);
          await AsyncStorage.removeItem(STORAGE_KEYS.INDEX);
        }

        cacheIndex.current.clear();
        totalHits.current = 0;
        totalMisses.current = 0;

        cacheLogger.info('🧹 Cleared all cache');
      }
    } catch (error) {
      cacheLogger.error('Error clearing cache:', error);
    }
  }, [config.persistToDisk, remove]);

  // Get multiple entries
  const getMultiple = useCallback(async <T = any>(keys: string[]): Promise<Map<string, T>> => {
    const results = new Map<string, T>();
    
    await Promise.all(
      keys.map(async (key) => {
        const data = await get<T>(key);
        if (data !== null) {
          results.set(key, data);
        }
      })
    );

    return results;
  }, [get]);

  // Set multiple entries
  const setMultiple = useCallback(async <T = any>(
    entries: Array<{ key: string; data: T; type?: CacheType }>
  ): Promise<boolean> => {
    try {
      await Promise.all(
        entries.map(({ key, data, type }) => set(key, data, type))
      );
      return true;
    } catch (error) {
      cacheLogger.error('Error setting multiple cache entries:', error);
      return false;
    }
  }, [set]);

  // Prune expired entries
  const prune = useCallback(async (): Promise<number> => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    memoryCache.current.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    });

    for (const key of expiredKeys) {
      await remove(key);
    }

    return expiredKeys.length;
  }, [remove]);

  // Optimize cache (LRU eviction)
  const optimize = useCallback(async (): Promise<void> => {
    try {
      const stats = await getStats();
      
      // Check size limit
      if (stats.totalSize > config.maxSize) {
        cacheLogger.warn(`⚠️ Cache size (${stats.totalSize.toFixed(2)}MB) exceeds limit (${config.maxSize}MB)`);
        
        // Sort by hits (LRU)
        const entries = Array.from(memoryCache.current.entries())
          .sort((a, b) => a[1].hits - b[1].hits);

        // Remove least used entries
        let removedSize = 0;
        const targetSize = config.maxSize * 0.8; // Reduce to 80% of max

        for (const [key, entry] of entries) {
          if (stats.totalSize - removedSize / (1024 * 1024) <= targetSize) {
            break;
          }
          await remove(key);
          removedSize += entry.size;
        }

        cacheLogger.info(`🗜️ Optimized cache: removed ${(removedSize / (1024 * 1024)).toFixed(2)}MB`);
      }

      // Check entry count limit
      if (memoryCache.current.size > config.maxEntries) {
        const entriesToRemove = memoryCache.current.size - Math.floor(config.maxEntries * 0.8);
        const entries = Array.from(memoryCache.current.entries())
          .sort((a, b) => a[1].hits - b[1].hits);

        for (let i = 0; i < entriesToRemove; i++) {
          await remove(entries[i][0]);
        }

        cacheLogger.info(`🗜️ Optimized cache: removed ${entriesToRemove} entries`);
      }
    } catch (error) {
      cacheLogger.error('Error optimizing cache:', error);
    }
  }, [config.maxSize, config.maxEntries, remove]);

  // Get cache statistics
  const getStats = useCallback(async (): Promise<CacheStats> => {
    const byType: Record<CacheType, { count: number; size: number }> = {
      html: { count: 0, size: 0 },
      api: { count: 0, size: 0 },
      product: { count: 0, size: 0 },
      category: { count: 0, size: 0 },
      image: { count: 0, size: 0 },
      script: { count: 0, size: 0 },
      style: { count: 0, size: 0 },
      resource: { count: 0, size: 0 },
    };

    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    memoryCache.current.forEach((entry) => {
      byType[entry.type].count++;
      byType[entry.type].size += entry.size;
      totalSize += entry.size;
      
      if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
      if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
    });

    const hitRate = totalHits.current + totalMisses.current > 0
      ? (totalHits.current / (totalHits.current + totalMisses.current)) * 100
      : 0;

    return {
      totalEntries: memoryCache.current.size,
      totalSize: totalSize / (1024 * 1024), // Convert to MB
      hitRate,
      byType,
      oldestEntry,
      newestEntry,
    };
  }, []);

  // Get cache size
  const getCacheSize = useCallback(async (): Promise<number> => {
    const stats = await getStats();
    return stats.totalSize;
  }, [getStats]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<CacheConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      
      // Persist config
      AsyncStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated))
        .catch(error => cacheLogger.error('Error saving config:', error));
      
      return updated;
    });
  }, []);

  return {
    get,
    set,
    has,
    remove,
    clear,
    getMultiple,
    setMultiple,
    prune,
    optimize,
    getStats,
    getCacheSize,
    config,
    updateConfig,
    isReady,
    isLoading,
  };
}

