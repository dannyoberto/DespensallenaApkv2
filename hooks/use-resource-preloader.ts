import { PreloadConfig, PreloadResource, PreloadResult, ResourcePreloader } from '@/services/ResourcePreloader';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResourcePreloaderOptions {
  config?: Partial<PreloadConfig>;
  autoStart?: boolean;
  onPreloadComplete?: (result: PreloadResult) => void;
  onPreloadError?: (error: string) => void;
}

interface UseResourcePreloaderReturn {
  preloader: ResourcePreloader;
  isPreloading: boolean;
  preloadResults: Map<string, PreloadResult>;
  stats: {
    totalResources: number;
    successfulPreloads: number;
    failedPreloads: number;
    averageLoadTime: number;
    totalSize: number;
  };
  preloadResource: (resource: PreloadResource) => Promise<PreloadResult>;
  preloadResources: (resources: PreloadResource[]) => Promise<PreloadResult[]>;
  clearCache: () => void;
  pausePreloading: () => void;
  resumePreloading: () => void;
}

export function useResourcePreloader(options: UseResourcePreloaderOptions = {}): UseResourcePreloaderReturn {
  const {
    config,
    autoStart = true,
    onPreloadComplete,
    onPreloadError,
  } = options;

  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadResults, setPreloadResults] = useState<Map<string, PreloadResult>>(new Map());
  const [stats, setStats] = useState({
    totalResources: 0,
    successfulPreloads: 0,
    failedPreloads: 0,
    averageLoadTime: 0,
    totalSize: 0,
  });

  const preloaderRef = useRef<ResourcePreloader | null>(null);
  const isPreloadingRef = useRef(false);

  // Initialize preloader
  useEffect(() => {
    if (!preloaderRef.current) {
      preloaderRef.current = ResourcePreloader.getInstance();
      
      if (config) {
        preloaderRef.current.configure(config);
      }
    }
  }, [config]);

  // Update stats when preload results change
  useEffect(() => {
    if (preloaderRef.current) {
      const newStats = preloaderRef.current.getStats();
      setStats(newStats);
    }
  }, [preloadResults]);

  // Handle preload completion
  const handlePreloadComplete = useCallback((result: PreloadResult) => {
    setPreloadResults(prev => {
      const newMap = new Map(prev);
      newMap.set(result.url, result);
      return newMap;
    });

    if (result.success) {
      onPreloadComplete?.(result);
    } else {
      onPreloadError?.(result.error || 'Preload failed');
    }
  }, [onPreloadComplete, onPreloadError]);

  // Preload single resource
  const preloadResource = useCallback(async (resource: PreloadResource): Promise<PreloadResult> => {
    if (!preloaderRef.current) {
      throw new Error('Preloader not initialized');
    }

    setIsPreloading(true);
    isPreloadingRef.current = true;

    try {
      const result = await preloaderRef.current.preloadResource(resource);
      handlePreloadComplete(result);
      return result;
    } finally {
      setIsPreloading(false);
      isPreloadingRef.current = false;
    }
  }, [handlePreloadComplete]);

  // Preload multiple resources
  const preloadResources = useCallback(async (resources: PreloadResource[]): Promise<PreloadResult[]> => {
    if (!preloaderRef.current) {
      throw new Error('Preloader not initialized');
    }

    setIsPreloading(true);
    isPreloadingRef.current = true;

    try {
      // Add resources to queue
      preloaderRef.current.addResources(resources);

      // Wait for all resources to complete
      const results: PreloadResult[] = [];
      for (const resource of resources) {
        try {
          const result = await preloaderRef.current.preloadResource(resource);
          results.push(result);
          handlePreloadComplete(result);
        } catch (error) {
          const errorResult: PreloadResult = {
            url: resource.url,
            success: false,
            size: 0,
            loadTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            cached: false,
          };
          results.push(errorResult);
          handlePreloadComplete(errorResult);
        }
      }

      return results;
    } finally {
      setIsPreloading(false);
      isPreloadingRef.current = false;
    }
  }, [handlePreloadComplete]);

  // Clear cache
  const clearCache = useCallback(() => {
    if (preloaderRef.current) {
      preloaderRef.current.clearCache();
      setPreloadResults(new Map());
    }
  }, []);

  // Pause preloading
  const pausePreloading = useCallback(() => {
    if (preloaderRef.current) {
      preloaderRef.current.pausePreloading();
    }
  }, []);

  // Resume preloading
  const resumePreloading = useCallback(() => {
    if (preloaderRef.current) {
      preloaderRef.current.resumePreloading();
    }
  }, []);

  // Auto-start preloading if enabled
  useEffect(() => {
    if (autoStart && preloaderRef.current) {
      preloaderRef.current.resumePreloading();
    }
  }, [autoStart]);

  return {
    preloader: preloaderRef.current!,
    isPreloading,
    preloadResults,
    stats,
    preloadResource,
    preloadResources,
    clearCache,
    pausePreloading,
    resumePreloading,
  };
}
