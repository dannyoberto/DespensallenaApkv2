import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const colorScheme = useColorScheme();
  const progressAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnimation]);

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: Colors[colorScheme ?? 'light'].spinner,
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      )}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={Colors[colorScheme ?? 'light'].spinner} 
          />
        </View>
      )}
      <WebView
        source={{ uri: 'https://despensallena.com' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={() => {
          setLoading(true);
          setShowProgress(true);
          setProgress(0);
        }}
        onLoadProgress={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setProgress(nativeEvent.progress);
        }}
        onLoadEnd={() => {
          setLoading(false);
          setShowProgress(false);
          setProgress(0);
        }}
        onError={() => {
          setLoading(false);
          setShowProgress(false);
          setProgress(0);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});
