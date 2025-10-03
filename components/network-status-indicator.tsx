import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkStatus } from '@/hooks/use-network-status';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface NetworkStatusIndicatorProps {
  showWhenConnected?: boolean;
}

export function NetworkStatusIndicator({ showWhenConnected = false }: NetworkStatusIndicatorProps) {
  const colorScheme = useColorScheme();
  const { isConnected, isInternetReachable, connectionType, isSlowConnection } = useNetworkStatus();

  // Don't show indicator if connected and showWhenConnected is false
  if (isConnected && isInternetReachable && !showWhenConnected) {
    return null;
  }

  const getStatusText = () => {
    if (!isConnected) {
      return 'Sin conexión';
    }
    if (!isInternetReachable) {
      return 'Sin internet';
    }
    if (isSlowConnection) {
      return 'Conexión lenta';
    }
    return 'Conectado';
  };

  const getStatusColor = () => {
    if (!isConnected || !isInternetReachable) {
      return '#e53935'; // Red
    }
    if (isSlowConnection) {
      return '#ff9800'; // Orange
    }
    return '#4caf50'; // Green
  };

  const getConnectionIcon = () => {
    if (!isConnected || !isInternetReachable) {
      return '📶❌';
    }
    if (isSlowConnection) {
      return '📶⚠️';
    }
    return '📶✅';
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: Colors[colorScheme ?? 'light'].background }
    ]}>
      <View style={[
        styles.statusBar,
        { backgroundColor: getStatusColor() }
      ]}>
        <Text style={styles.icon}>{getConnectionIcon()}</Text>
        <Text style={styles.text}>{getStatusText()}</Text>
        {connectionType && (
          <Text style={styles.connectionType}>
            {connectionType.toUpperCase()}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  connectionType: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
});
