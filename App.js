import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import './src/i18n';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import MainNavigator from './src/navigation/MainNavigator';
import SettingsScreen from './src/screens/SettingsScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import BookmarksScreen from './src/screens/BookmarksScreen';
import BlockedListScreen from './src/screens/BlockedListScreen';
import ChatScreen from './src/screens/ChatScreen';
import HashtagScreen from './src/screens/HashtagScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import StoryViewerScreen from './src/screens/StoryViewerScreen';
import ReportScreen from './src/screens/ReportScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import AboutScreen from './src/screens/AboutScreen';
import ContactScreen from './src/screens/ContactScreen';
import TermsScreen from './src/screens/TermsScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SearchScreen from './src/screens/SearchScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import VerificationSentScreen from './src/screens/VerificationSentScreen';
import VerificationCodeScreen from './src/screens/VerificationCodeScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import VerificationSuccessScreen from './src/screens/VerificationSuccessScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import FollowingScreen from './src/screens/FollowingScreen';
import FollowersScreen from './src/screens/FollowersScreen';
import DeviceVerificationScreen from './src/screens/DeviceVerificationScreen';
import TwoFactorScreen from './src/screens/TwoFactorScreen';
import TwoFactorSetupScreen from './src/screens/TwoFactorSetupScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import OfflineBanner from './src/components/OfflineBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { registerForPushNotificationsAsync } from './src/utils/pushNotifications';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AppDataProvider } from './src/contexts/AppDataContext';
import { StoriesProvider } from './src/contexts/StoriesContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { ModerationProvider } from './src/contexts/ModerationContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { AdProvider } from './src/contexts/AdContext'; // Initialize i18n

// Create navigation integration reference for Sentry
const routingInstrumentation = Sentry.reactNavigationIntegration();

// Initialize Sentry for error tracking (only in production)
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN && !__DEV__) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    enableInExpoDevelopment: false,
    debug: false,
    sendDefaultPii: true,
    beforeSend(event) {
      // Only send events in production
      if (__DEV__) return null;
      return event;
    },
    integrations: [routingInstrumentation],
    tracesSampleRate: 0.2,
  });
}

const Stack = createStackNavigator();

const linking = {
  prefixes: ['xora://', 'https://xorasocial.com', 'https://www.xorasocial.com'],
  config: {
    screens: {
      Main: '',
      PostDetail: 'post/:postId',
      Hashtag: 'tag/:tag',
      UserProfile: 'u/:username',
    },
  },
};

const RootNavigator = () => {
  const { isAuthenticated, loading, token } = useAuth();
  const [registeredForToken, setRegisteredForToken] = useState(null);
  const navigationRef = React.useRef(null);

  // Initialize push notifications
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (registeredForToken === token) return;

    (async () => {
      try {
        await registerForPushNotificationsAsync(token);
        setRegisteredForToken(token);
      } catch (_e) {
        // Error registering push notifications
      }
    })();
  }, [isAuthenticated, token, registeredForToken]);

  // Make navigation ref available globally for push notification handlers
  useEffect(() => {
    global.navigationRef = navigationRef;
  }, []);

  if (loading) {
    // Simple loading placeholder; can be replaced with a splash later
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <StatusBar style="auto" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <OfflineBanner />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Group>
              <Stack.Screen component={MainNavigator} name="Main" />
              <Stack.Screen component={SettingsScreen} name="Settings" />
              <Stack.Screen component={CreatePostScreen} name="CreatePost" />
              <Stack.Screen component={BookmarksScreen} name="Bookmarks" />
              <Stack.Screen component={BlockedListScreen} name="Blocked" />
              <Stack.Screen component={ChatScreen} name="Chat" />
              <Stack.Screen component={HashtagScreen} name="Hashtag" />
              <Stack.Screen component={PostDetailScreen} name="PostDetail" />
              <Stack.Screen component={StoryViewerScreen} name="StoryViewer" />
              <Stack.Screen component={ReportScreen} name="Report" />
              <Stack.Screen component={SecurityScreen} name="Security" />
              <Stack.Screen component={TwoFactorSetupScreen} name="TwoFactorSetup" />
              <Stack.Screen component={AboutScreen} name="About" />
              <Stack.Screen component={ContactScreen} name="Contact" />
              <Stack.Screen component={TermsScreen} name="Terms" />
              <Stack.Screen component={PrivacyScreen} name="Privacy" />
              <Stack.Screen component={NotificationsScreen} name="Notifications" />
              <Stack.Screen component={SearchScreen} name="Search" />
              <Stack.Screen component={EditProfileScreen} name="EditProfile" />
              <Stack.Screen component={UserProfileScreen} name="UserProfile" />
              <Stack.Screen component={FollowingScreen} name="Following" />
              <Stack.Screen component={FollowersScreen} name="Followers" />
            </Stack.Group>
          ) : (
            <Stack.Group screenOptions={{ animationEnabled: false }}>
              <Stack.Screen component={LoginScreen} name="Login" />
              <Stack.Screen component={SignupScreen} name="Signup" />
              <Stack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
              <Stack.Screen component={VerificationSentScreen} name="VerificationSent" />
              <Stack.Screen component={VerificationCodeScreen} name="VerificationCode" />
              <Stack.Screen component={ResetPasswordScreen} name="ResetPassword" />
              <Stack.Screen component={VerificationSuccessScreen} name="VerificationSuccess" />
              <Stack.Screen
                component={DeviceVerificationScreen}
                name="DeviceVerification"
                options={{ title: 'Verify Device', headerShown: true }}
              />
              <Stack.Screen
                component={TwoFactorScreen}
                name="TwoFactor"
                options={{ title: 'Two-Factor Authentication', headerShown: true }}
              />
              <Stack.Screen component={VerifyEmailScreen} name="VerifyEmail" />
              <Stack.Screen component={TermsScreen} name="Terms" />
              <Stack.Screen component={PrivacyScreen} name="Privacy" />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

// Wrapper to apply theme from SettingsContext
const ThemedContent = ({ children }) => {
  const { settings, loaded } = useSettings();

  if (!loaded) {
    return null;
  }

  // Provide default highContrastMode if settings somehow doesn't exist
  const highContrastMode = settings?.highContrastMode ?? false;
  return <ThemeProvider highContrastMode={highContrastMode}>{children}</ThemeProvider>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <SettingsProvider>
            <ThemedContent>
              <ProfileProvider>
                <NetworkProvider>
                  <ModerationProvider>
                    <AppDataProvider>
                      <StoriesProvider>
                        <AdProvider>
                          <RootNavigator />
                        </AdProvider>
                      </StoriesProvider>
                    </AppDataProvider>
                  </ModerationProvider>
                </NetworkProvider>
              </ProfileProvider>
            </ThemedContent>
          </SettingsProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
