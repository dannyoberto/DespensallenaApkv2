import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

interface GoogleOAuthState {
  isAuthenticating: boolean;
  authError: string | null;
  authSuccess: boolean;
}

interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
  responseType: string;
}

export function useGoogleOAuth() {
  const [oauthState, setOauthState] = useState<GoogleOAuthState>({
    isAuthenticating: false,
    authError: null,
    authSuccess: false,
  });

  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Google OAuth configuration
  const oauthConfig: GoogleOAuthConfig = {
    clientId: 'your-google-client-id', // This should be configured
    redirectUri: 'https://despensallena.com/mi-cuenta/',
    scope: ['openid', 'profile', 'email'],
    responseType: 'code',
  };

  // Handle Google OAuth URL
  const handleGoogleOAuthUrl = useCallback((url: string): boolean => {
    console.log('🔍 Checking Google OAuth URL:', url);

    // Check if it's a Google OAuth URL (more comprehensive)
    if (url.includes('accounts.google.com') || 
        url.includes('oauth2.googleapis.com') ||
        url.includes('google.com/oauth') ||
        url.includes('loginSocial=google') ||
        url.includes('google.com/signin') ||
        url.includes('google.com/accounts') ||
        url.includes('gstatic.com')) {
      
      console.log('✅ Google OAuth URL detected');
      
      // Never show spinner on any Google OAuth pages - Google has its own progress indicators
      console.log('📝 Google OAuth page detected - keeping authentication state disabled');
      setOauthState(prev => ({
        ...prev,
        isAuthenticating: false, // Always keep as false for Google pages
        authError: null,
      }));

      return true; // Allow the request
    }

    return false;
  }, []);

  // Start authentication process (called when user clicks "Siguiente")
  const startAuthentication = useCallback(() => {
    console.log('🚀 Starting Google OAuth authentication - but not showing spinner (Google has its own progress)');
    // Don't activate spinner for Google OAuth - Google shows its own progress indicators
    // Just log the authentication start for debugging purposes
    setOauthState(prev => ({
      ...prev,
      isAuthenticating: false, // Keep as false so no spinner shows
      authError: null,
    }));
  }, []);

  // Handle OAuth success
  const handleOAuthSuccess = useCallback(() => {
    console.log('✅ Google OAuth successful');
    setOauthState({
      isAuthenticating: false,
      authError: null,
      authSuccess: true,
    });

    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
  }, []);

  // Handle OAuth error
  const handleOAuthError = useCallback((error: string) => {
    console.error('❌ Google OAuth error:', error);
    setOauthState({
      isAuthenticating: false,
      authError: error,
      authSuccess: false,
    });

    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
  }, []);

  // Reset OAuth state
  const resetOAuthState = useCallback(() => {
    setOauthState({
      isAuthenticating: false,
      authError: null,
      authSuccess: false,
    });

    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
  }, []);

  // Handle deep linking for OAuth callbacks
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (url.includes('despensallena.com') && url.includes('code=')) {
        handleOAuthSuccess();
      } else if (url.includes('error=')) {
        const error = url.split('error=')[1]?.split('&')[0] || 'Unknown error';
        handleOAuthError(decodeURIComponent(error));
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, [handleOAuthSuccess, handleOAuthError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  return {
    oauthState,
    oauthConfig,
    handleGoogleOAuthUrl,
    startAuthentication,
    handleOAuthSuccess,
    handleOAuthError,
    resetOAuthState,
  };
}
