import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const tf = (key, fallback) => {
    const value = t(key);
    return !value || value === key ? fallback : value;
  };
  const { login } = useAuth();
  const { settings } = useSettings();
  const { isOnline, registerError } = useNetwork();
  const { colors } = useTheme();
  const largeText = settings.textSizeLarge;
  const { reduceMotion } = settings;
  
  // Pre-fill email if coming from email verification
  const initialEmail = navigation?.route?.params?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(tf('common.error', 'Error'), tf('auth.missingCredentials', 'Please enter both email and password.'));
      return;
    }

    if (!isOnline) {
      const msg = tf('auth.offlineLogin', 'You appear to be offline. Login requires a connection.');
      registerError(msg);
      Alert.alert(t('common.error'), msg);
      return;
    }

    try {
      setSubmitting(true);
      const result = await login(email, password);

      // Check if device verification is required
      if (result && result.requiresVerification) {
        navigation.navigate('DeviceVerification', { email, tempToken: result.tempToken });
        return;
      }

      // Check if 2FA is required
      if (result && result.requires2FA) {
        navigation.navigate('TwoFactor', {
          email,
          tempToken: result.tempToken,
          message: result.message,
        });

      }

      // Navigation will happen automatically when isAuthenticated changes in App.js
    } catch (e) {
      Alert.alert(tf('common.error', 'Error'), e.message || tf('auth.loginFailed', 'Login failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.background]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' && !reduceMotion ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.surface }]}>
              <Text style={[styles.logoText, { color: colors.primary }, largeText && styles.logoTextLarge]}>X</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }, largeText && styles.appNameLarge]}>Xora Social</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }, largeText && styles.taglineLarge]}>Connect with the world</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={tf('auth.email', 'Email')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder={tf('auth.password', 'Password')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                style={[styles.passwordInput, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  color={colors.textSecondary}
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              disabled={submitting}
              style={[styles.loginButton, { backgroundColor: colors.surface }]}
              onPress={handleLogin}
            >
              <Text style={[styles.loginButtonText, { color: colors.primary }, largeText && styles.loginButtonTextLarge]}>
                {submitting ? tf('common.loading', 'Loading...') : tf('auth.login', 'Log in')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.text }, largeText && styles.forgotPasswordTextLarge]}>
                {tf('auth.forgotPassword', 'Forgot password?')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: colors.text }, largeText && styles.signupTextLarge]}>
              Don’t have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, { color: colors.primary }, largeText && styles.signupLinkLarge]}>
                {tf('auth.signup', 'Sign up')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms / Privacy hint */}
          <View style={styles.termsHintContainer}>
            <Text style={[styles.termsHintText, { color: colors.textSecondary }, largeText && styles.termsHintTextLarge]}>
              {tf('auth.termsPrefix', 'By continuing, you agree to the ')}
              <Text
                style={[styles.termsHintLink, { color: colors.primary }]}
                onPress={() => navigation.navigate('Terms')}
              >
                {t('settings.termsOfService') || 'Terms of Service'}
              </Text>
              <Text>{' '}{tf('auth.and', 'and')} </Text>
              <Text
                style={[styles.termsHintLink, { color: colors.primary }]}
                onPress={() => navigation.navigate('Privacy')}
              >
                {t('settings.privacyPolicy') || 'Privacy Policy'}
              </Text>
              .
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',

  },
  logoTextLarge: {
    fontSize: 52,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appNameLarge: {
    fontSize: 34,
  },
  tagline: {
    fontSize: 16,

  },
  taglineLarge: {
    fontSize: 18,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  inputLarge: {
    fontSize: 18,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    borderRadius: 12,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  loginButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButtonTextLarge: {
    fontSize: 20,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  forgotPasswordTextLarge: {
    fontSize: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  signupText: {
    fontSize: 14,
  },
  signupTextLarge: {
    fontSize: 16,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  signupLinkLarge: {
    fontSize: 16,
  },
  termsHintContainer: {
    marginTop: 12,
    paddingHorizontal: 30,
  },
  termsHintText: {
    fontSize: 12,
  },
  termsHintTextLarge: {
    fontSize: 14,
  },
  termsHintLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
