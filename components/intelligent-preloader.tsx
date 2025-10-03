import {
    getResourcesForNetworkSpeed,
    PRELOAD_STRATEGIES,
    type PreloadResource
} from '@/config/critical-resources';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useResourcePreloader } from '@/hooks/use-resource-preloader';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface IntelligentPreloaderProps {
  onPreloadComplete?: (results: any[]) => void;
  onPreloadError?: (error: string) => void;
  strategy?: keyof typeof PRELOAD_STRATEGIES;
  showProgress?: boolean;
  autoStart?: boolean;
}

export function IntelligentPreloader({
  onPreloadComplete,
  onPreloadError,
  strategy = 'ESSENTIAL',
  showProgress = true,
  autoStart = true,
}: IntelligentPreloaderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [currentResource, setCurrentResource] = useState<string>('');
  
  const colorScheme = useColorScheme();
  const { isConnected, isInternetReachable, connectionType, isSlowConnection } = useNetworkStatus();
  
  const {
    isPreloading,
    preloadResults,
    stats,
    preloadResources,
    clearCache,
    pausePreloading,
    resumePreloading,
  } = useResourcePreloader({
    config: {
      enabled: true,
      maxConcurrent: isSlowConnection ? 1 : 3,
      timeout: isSlowConnection ? 15000 : 10000,
      retryAttempts: isSlowConnection ? 1 : 2,
      retryDelay: isSlowConnection ? 2000 : 1000,
      networkThreshold: isSlowConnection ? 50 : 100,
    },
    autoStart: false, // We'll control this manually
    onPreloadComplete: (result) => {
      console.log(`✅ Preloaded: ${result.url}`);
      updateProgress();
    },
    onPreloadError: (error) => {
      console.warn(`❌ Preload error: ${error}`);
      onPreloadError?.(error);
    },
  });

  const progressRef = useRef(0);
  const totalResourcesRef = useRef(0);

  // Initialize preloading
  useEffect(() => {
    if (autoStart && isConnected && isInternetReachable && !isInitialized) {
      initializePreloading();
    }
  }, [autoStart, isConnected, isInternetReachable, isInitialized]);

  // Handle network changes
  useEffect(() => {
    if (!isConnected || !isInternetReachable) {
      pausePreloading();
    } else if (isInitialized) {
      resumePreloading();
    }
  }, [isConnected, isInternetReachable, isInitialized]);

  // Initialize preloading based on network conditions
  const initializePreloading = useCallback(async () => {
    if (isInitialized) return;

    try {
      setIsInitialized(true);
      
      // Select resources based on network speed
      const networkSpeed = isSlowConnection ? 50 : 500; // Estimate based on connection type
      const resourcesToPreload = getResourcesForNetworkSpeed(networkSpeed);
      
      // Override with strategy if specified
      const finalResources = strategy === 'ESSENTIAL' 
        ? PRELOAD_STRATEGIES.ESSENTIAL 
        : resourcesToPreload;

      totalResourcesRef.current = finalResources.length;
      setPreloadProgress(0);
      progressRef.current = 0;

      console.log(`🚀 Starting preload of ${finalResources.length} resources`);
      console.log(`📶 Network: ${connectionType}, Slow: ${isSlowConnection}`);

      // Start preloading
      const results = await preloadResources(finalResources);
      
      console.log(`✅ Preloading completed: ${results.filter(r => r.success).length}/${results.length} successful`);
      onPreloadComplete?.(results);
      
    } catch (error) {
      console.error('❌ Preloading initialization failed:', error);
      onPreloadError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [isInitialized, isSlowConnection, connectionType, strategy, preloadResources, onPreloadComplete, onPreloadError]);

  // Update progress
  const updateProgress = useCallback(() => {
    const completed = preloadResults.size;
    const total = totalResourcesRef.current;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    
    progressRef.current = progress;
    setPreloadProgress(progress);
    
    // Find current resource being loaded
    const currentResource = Array.from(preloadResults.values())
      .find(r => !r.success && !r.cached);
    setCurrentResource(currentResource?.url || '');
  }, [preloadResults]);

  // Manual preload trigger
  const triggerPreload = useCallback(async (resources: PreloadResource[]) => {
    try {
      setIsInitialized(false);
      await preloadResources(resources);
      setIsInitialized(true);
    } catch (error) {
      console.error('Manual preload failed:', error);
    }
  }, [preloadResources]);

  // Clear cache and restart
  const restartPreloading = useCallback(() => {
    clearCache();
    setIsInitialized(false);
    setPreloadProgress(0);
    progressRef.current = 0;
    totalResourcesRef.current = 0;
    setCurrentResource('');
  }, [clearCache]);

  // Get progress text
  const getProgressText = () => {
    if (!isInitialized) return 'Initializing...';
    if (isPreloading) return `Preloading... ${Math.round(preloadProgress)}%`;
    if (preloadProgress === 100) return 'Preloading complete';
    return 'Ready';
  };

  // Get current resource name
  const getCurrentResourceName = () => {
    if (!currentResource) return '';
    try {
      const url = new URL(currentResource);
      return url.pathname.split('/').pop() || url.hostname;
    } catch {
      return currentResource;
    }
  };

  if (!showProgress) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: Colors[colorScheme ?? 'light'].background }
    ]}>
      {isPreloading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator 
            size="small" 
            color={Colors[colorScheme ?? 'light'].spinner} 
          />
          <Text style={styles.progressText}>
            {getProgressText()}
          </Text>
          {currentResource && (
            <Text style={styles.resourceText}>
              Loading: {getCurrentResourceName()}
            </Text>
          )}
        </View>
      )}
      
      {isInitialized && !isPreloading && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            ✅ {stats.successfulPreloads}/{stats.totalResources} resources preloaded
          </Text>
          <Text style={styles.statsSubtext}>
            {Math.round(stats.totalSize / 1024)}KB cached
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  resourceText: {
    marginLeft: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  statsContainer: {
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4caf50',
  },
  statsSubtext: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
  },
});
