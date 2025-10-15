import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGoogleOAuth } from '@/hooks/use-google-oauth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface GoogleOAuthHandlerProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
  showProgress?: boolean;
}

export function GoogleOAuthHandler({
  onAuthSuccess,
  onAuthError,
  showProgress = true,
}: GoogleOAuthHandlerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const colorScheme = useColorScheme();
  const {
    oauthState,
    handleOAuthSuccess,
    handleOAuthError,
    resetOAuthState,
  } = useGoogleOAuth();

  // Show handler when authentication starts (but never on Google pages)
  useEffect(() => {
    if (oauthState.isAuthenticating) {
      setIsVisible(true);
    } else if (oauthState.authSuccess || oauthState.authError) {
      // Hide after 2 seconds
      setTimeout(() => {
        setIsVisible(false);
        resetOAuthState();
      }, 2000);
    } else {
      // Hide immediately if not authenticating
      setIsVisible(false);
    }
  }, [oauthState, resetOAuthState]);

  // Handle auth success
  useEffect(() => {
    if (oauthState.authSuccess) {
      onAuthSuccess?.();
    }
  }, [oauthState.authSuccess, onAuthSuccess]);

  // Handle auth error
  useEffect(() => {
    if (oauthState.authError) {
      onAuthError?.(oauthState.authError);
    }
  }, [oauthState.authError, onAuthError]);

  // Get status text
  const getStatusText = () => {
    if (oauthState.isAuthenticating) {
      return 'Iniciando sesión con Google...';
    }
    if (oauthState.authSuccess) {
      return '¡Sesión iniciada exitosamente!';
    }
    if (oauthState.authError) {
      return `Error: ${oauthState.authError}`;
    }
    return '';
  };

  // Get status color
  const getStatusColor = () => {
    if (oauthState.isAuthenticating) {
      return Colors[colorScheme ?? 'light'].spinner;
    }
    if (oauthState.authSuccess) {
      return '#4caf50';
    }
    if (oauthState.authError) {
      return '#e53935';
    }
    return Colors[colorScheme ?? 'light'].spinner;
  };

  // Don't show spinner on any Google pages - Google has its own progress indicators
  if (!showProgress || !isVisible) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: Colors[colorScheme ?? 'light'].background }
    ]}>
      <View style={styles.content}>
        {oauthState.isAuthenticating && (
          <ActivityIndicator 
            size="small" 
            color={getStatusColor()} 
            style={styles.spinner}
          />
        )}
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
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
    zIndex: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
