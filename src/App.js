import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NetworkProvider } from './contexts/NetworkContext';
import MainNavigator from './navigation/MainNavigator';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    let isMounted = true;

    // Handle deep links
    const handleDeepLink = (event) => {
      const { url } = event;
      if (__DEV__) console.warn('Deep link received:', url);

      // Handle other deep link scenarios here if needed
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (!isMounted) return;
      if (url) {
        handleDeepLink({ url });
      }
      return null;
    }).catch((err) => {
      if (!isMounted) return;
      console.warn('Failed to get initial URL', err);
    });

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <ThemeProvider>
            <SettingsProvider>
              <NetworkProvider>
                <MainNavigator />
              </NetworkProvider>
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
