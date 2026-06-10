import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface SplashControllerContextValue {
  webViewReady: boolean;
  notifyWebViewReady: () => void;
  showSplashOverlay: boolean;
  dismissSplashOverlay: () => void;
}

const SplashControllerContext = createContext<SplashControllerContextValue | null>(null);

export function SplashControllerProvider({ children }: { children: React.ReactNode }) {
  const [webViewReady, setWebViewReady] = useState(false);
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);

  const notifyWebViewReady = useCallback(() => {
    setWebViewReady(true);
  }, []);

  const dismissSplashOverlay = useCallback(() => {
    setShowSplashOverlay(false);
  }, []);

  const value = useMemo(
    () => ({
      webViewReady,
      notifyWebViewReady,
      showSplashOverlay,
      dismissSplashOverlay,
    }),
    [webViewReady, notifyWebViewReady, showSplashOverlay, dismissSplashOverlay]
  );

  return (
    <SplashControllerContext.Provider value={value}>
      {children}
    </SplashControllerContext.Provider>
  );
}

export function useSplashController() {
  const context = useContext(SplashControllerContext);
  if (!context) {
    throw new Error('useSplashController must be used within SplashControllerProvider');
  }
  return context;
}
