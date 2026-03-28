import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ReelsScreen from '../screens/ReelsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import VerificationCodeScreen from '../screens/VerificationCodeScreen';
import VerificationSentScreen from '../screens/VerificationSentScreen';
import VerificationSuccessScreen from '../screens/VerificationSuccessScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TwoFactorScreen from '../screens/TwoFactorScreen';
import DeviceVerificationScreen from '../screens/DeviceVerificationScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabBarIcon = memo(({ routeName, focused, color, size }) => {
  let iconName;

  if (routeName === 'Home') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (routeName === 'Explore') {
    iconName = focused ? 'search' : 'search-outline';
  } else if (routeName === 'Reels') {
    iconName = focused ? 'play-circle' : 'play-circle-outline';
  } else if (routeName === 'Messages') {
    iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
  } else if (routeName === 'Profile') {
    iconName = focused ? 'person' : 'person-outline';
  }

  return <Ionicons color={color} name={iconName} size={size} />;
});

TabBarIcon.displayName = 'TabBarIcon';

function TabNavigator() {
  const _insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => (
          <TabBarIcon
            color={color}
            focused={focused}
            routeName={route.name}
            size={size}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 56,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen component={HomeScreen} name="Home" />
      <Tab.Screen component={ExploreScreen} name="Explore" />
      <Tab.Screen component={ReelsScreen} name="Reels" />
      <Tab.Screen component={MessagesScreen} name="Messages" />
      <Tab.Screen component={ProfileScreen} name="Profile" />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    // Return null or a loading component while checking auth
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen component={TabNavigator} name="TabsRoot" />
      ) : (
        <>
          <Stack.Screen component={LoginScreen} name="Login" />
          <Stack.Screen component={SignupScreen} name="Signup" />
          <Stack.Screen component={VerifyEmailScreen} name="VerifyEmail" />
          <Stack.Screen component={VerificationCodeScreen} name="VerificationCode" />
          <Stack.Screen component={VerificationSentScreen} name="VerificationSent" />
          <Stack.Screen component={VerificationSuccessScreen} name="VerificationSuccess" />
          <Stack.Screen component={ResetPasswordScreen} name="ResetPassword" />
          <Stack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
          <Stack.Screen component={TwoFactorScreen} name="TwoFactor" />
          <Stack.Screen component={DeviceVerificationScreen} name="DeviceVerification" />
          <Stack.Screen component={TermsScreen} name="Terms" />
          <Stack.Screen component={PrivacyScreen} name="Privacy" />
        </>
      )}
    </Stack.Navigator>
  );
}
