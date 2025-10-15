/**
 * Optimized Network Status Hook
 * Uses @react-native-community/netinfo for efficient network detection
 */

import { networkLogger } from '@/utils/logger';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: NetInfoStateType;
  isSlowConnection: boolean;
  effectiveType: string | null; // '2g', '3g', '4g', 'wifi', etc.
  downloadSpeed: number | null; // in Mbps
}

interface NetworkMetrics {
  lastCheckTime: number;
  checksCount: number;
  connectionChanges: number;
}

const SLOW_CONNECTION_TYPES = ['2g', '3g', 'slow-2g'];
const SLOW_CONNECTION_THRESHOLD_MBPS = 1; // Consider < 1 Mbps as slow

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'wifi',
    isSlowConnection: false,
    effectiveType: null,
    downloadSpeed: null,
  });

  const [metrics, setMetrics] = useState<NetworkMetrics>({
    lastCheckTime: Date.now(),
    checksCount: 0,
    connectionChanges: 0,
  });

  // Determine if connection is slow
  const isConnectionSlow = useCallback((state: NetInfoState): boolean => {
    // Check by connection type
    if (state.type === 'cellular' && state.details) {
      const cellularType = (state.details as any).cellularGeneration;
      if (SLOW_CONNECTION_TYPES.includes(cellularType)) {
        return true;
      }
    }

    // Check by effective type
    const effectiveType = (state.details as any)?.effectiveConnectionType;
    if (effectiveType && SLOW_CONNECTION_TYPES.includes(effectiveType)) {
      return true;
    }

    // Check by download speed if available
    const downloadSpeed = (state.details as any)?.downlink;
    if (downloadSpeed && downloadSpeed < SLOW_CONNECTION_THRESHOLD_MBPS) {
      return true;
    }

    return false;
  }, []);

  // Handle network state change
  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable ?? isConnected;
    const connectionType = state.type;
    const isSlowConnection = isConnectionSlow(state);
    
    // Extract additional metrics
    const effectiveType = (state.details as any)?.effectiveConnectionType || null;
    const downloadSpeed = (state.details as any)?.downlink || null;

    // Update status
    setNetworkStatus(prev => {
      const hasChanged = 
        prev.isConnected !== isConnected ||
        prev.connectionType !== connectionType;

      if (hasChanged) {
        setMetrics(m => ({
          ...m,
          connectionChanges: m.connectionChanges + 1,
          lastCheckTime: Date.now(),
        }));

        networkLogger.info(
          `📡 Network changed: ${connectionType} | Connected: ${isConnected} | Slow: ${isSlowConnection}`
        );
      }

      return {
        isConnected,
        isInternetReachable,
        connectionType,
        isSlowConnection,
        effectiveType,
        downloadSpeed,
      };
    });

    setMetrics(m => ({ ...m, checksCount: m.checksCount + 1 }));
  }, [isConnectionSlow]);

  // Subscribe to network changes
  useEffect(() => {
    networkLogger.info('🚀 Initializing network monitoring...');

    // Get initial state
    NetInfo.fetch().then(state => {
      networkLogger.info('📊 Initial network state:', {
        type: state.type,
        connected: state.isConnected,
        reachable: state.isInternetReachable,
      });
      handleNetworkChange(state);
    });

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    return () => {
      networkLogger.info('🛑 Stopping network monitoring');
      unsubscribe();
    };
  }, [handleNetworkChange]);

  // Log metrics periodically in dev
  useEffect(() => {
    if (__DEV__) {
      const interval = setInterval(() => {
        networkLogger.debug('📊 Network metrics:', {
          checks: metrics.checksCount,
          changes: metrics.connectionChanges,
          uptime: ((Date.now() - metrics.lastCheckTime) / 1000).toFixed(0) + 's',
        });
      }, 60000); // Every minute

      return () => clearInterval(interval);
    }
  }, [metrics]);

  return networkStatus;
}

// Utility function to check if network is available
export async function checkNetworkAvailability(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

// Utility function to get current network speed estimate
export async function getNetworkSpeed(): Promise<number | null> {
  const state = await NetInfo.fetch();
  return (state.details as any)?.downlink || null;
}