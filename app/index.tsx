import { OptimizedWebView } from '@/components/optimized-webview';
import React from 'react';

export default function HomeScreen() {
  return (
    <OptimizedWebView
      source={{ uri: 'https://despensallena.com' }}
      onLoadStart={() => {
        console.log('WebView loading started');
      }}
      onLoadEnd={() => {
        console.log('WebView loading completed');
      }}
      onError={(error) => {
        console.error('WebView error:', error);
      }}
    />
  );
}
