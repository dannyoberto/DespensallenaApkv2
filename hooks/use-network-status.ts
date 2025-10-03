import { useEffect, useState } from 'react';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string | null;
  isSlowConnection: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'wifi',
    isSlowConnection: false,
  });

  useEffect(() => {
    // Simple network detection using fetch
    const checkNetworkStatus = async () => {
      try {
        // Try to fetch a small resource to test connectivity
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
        });
        
        setNetworkStatus(prev => ({
          ...prev,
          isConnected: true,
          isInternetReachable: true,
        }));
      } catch (error) {
        console.warn('Network check failed:', error);
        setNetworkStatus(prev => ({
          ...prev,
          isConnected: false,
          isInternetReachable: false,
        }));
      }
    };

    // Initial check
    checkNetworkStatus();

    // Check periodically
    const interval = setInterval(checkNetworkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return networkStatus;
}