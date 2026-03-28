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
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const SignupScreen = ({ navigation }) => {
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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);

  const evaluateStrength = (pwd) => {
    if (!pwd || pwd.length < 6) return 'weak';
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    if (pwd.length >= 10 && hasNumber && hasSymbol) return 'strong';
    return 'medium';
  };

  const handleSignup = async () => {
    if (!(name && name.trim()) || !(email && email.trim()) || !(username && username.trim()) || !password || !confirm) {
      Alert.alert(
        tf('common.error', 'Error'),
        tf('auth.missingSignupFields', 'Please fill in all fields, including username.'),
      );
      return;
    }

    const usernameTrimmed = (username || '').trim();
    const usernameValid = /^[A-Za-z0-9_]{3,30}$/.test(usernameTrimmed);
    if (!usernameValid) {
      Alert.alert(
        t('common.error'),
        t('auth.invalidUsername') ||
          'Username must be 3-30 characters and use only letters, numbers, and underscores.',
      );
      return;
    }

    if (password.length < 10) {
      Alert.alert(
        tf('common.error', 'Error'),
        tf('auth.passwordTooShort', 'Password must be at least 10 characters.'),
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert(tf('common.error', 'Error'), tf('auth.passwordMismatch', 'Passwords do not match.'));
      return;
    }
    if (!agreedToTerms) {
      Alert.alert(
        tf('common.error', 'Error'),
        tf('auth.termsAgree', 'You must agree to the Terms of Service and Privacy Policy.'),
      );
      return;
    }

    if (!isOnline) {
      const msg =
        tf('auth.offlineSignup', 'You appear to be offline. Sign-up requires an internet connection.');
      registerError(msg);
      Alert.alert(t('common.error'), msg);
      return;
    }

    try {
      setSubmitting(true);

      const nameTrimmed = (name || '').trim();
      const emailTrimmed = (email || '').trim();

      // First create the account via backend signup
      const signupResult = await api.signup(
        nameTrimmed,
        emailTrimmed,
        usernameTrimmed,
        password,
      );

      if (!signupResult?.success) {
        throw new Error(signupResult?.error || 'Sign-up failed');
      }

      // Check if email verification is required (new signup flow)
      if (signupResult?.requiresEmailVerification || signupResult?.data?.requiresEmailVerification) {
        const tempToken = signupResult?.tempToken || signupResult?.data?.tempToken;
        const userEmail = signupResult?.email || signupResult?.data?.email || emailTrimmed;

        Alert.alert(
          tf('common.info', 'Verify Your Email'),
          signupResult?.message || signupResult?.data?.message ||
            `A verification code has been sent to ${userEmail}. Please verify your email to complete registration.`,
        );

        // Navigate to email verification screen
        navigation.replace('VerifyEmail', {
          tempToken,
          email: userEmail,
          type: 'signup',
        });
        return;
      }

      // Legacy flow: If no email verification required, try to login
      const loginResult = await login(emailTrimmed, password);

      if (loginResult?.requiresVerification) {
        Alert.alert(
          tf('common.info', 'Check your email'),
          loginResult.message ||
            'A verification code has been sent to your email. Please verify this device before logging in.',
        );
        navigation.replace('Login');
        return;
      }

      navigation.replace('Main');
    } catch (e) {
      Alert.alert(
        tf('common.error', 'Error'),
        e.message || tf('auth.signupFailed', 'Sign-up failed.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={[colors.primary, colors.background]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' && !reduceMotion ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <Text style={[styles.title, { color: colors.text }, largeText && styles.titleLarge]}>
              {tf('auth.createAccount', 'Create your account')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }, largeText && styles.subtitleLarge]}>
              {tf('auth.signupSubtitle', 'Join Xora Social in a few simple steps.')}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              placeholder={tf('auth.fullName', 'Full name')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={tf('auth.email', 'Email')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              autoCapitalize="none"
              placeholder={tf('auth.username', 'Username')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
              value={username}
              onChangeText={setUsername}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder={tf('auth.password', 'Password')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                style={[styles.passwordInput, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  setPasswordStrength(evaluateStrength(val));
                }}
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
            {password ? (
              <Text style={[styles.helperText, { color: colors.textSecondary }] }>
                {passwordStrength === 'strong'
                  ? tf('auth.passwordStrong', 'Strong password')
                  : passwordStrength === 'medium'
                    ? tf('auth.passwordMedium', 'Decent password, you can still improve it.')
                    : tf('auth.passwordWeak', 'Weak password. Use more characters, numbers, and symbols.')}
              </Text>
            ) : null}
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder={tf('auth.confirmPassword', 'Confirm password')}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                style={[styles.passwordInput, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
                value={confirm}
                onChangeText={setConfirm}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  color={colors.textSecondary}
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.termsRow}>
              <TouchableOpacity
                style={[styles.checkboxOuter, { borderColor: colors.textSecondary }]}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                {agreedToTerms ? <View style={[styles.checkboxInner, { backgroundColor: colors.text }]} /> : null}
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: colors.text }, largeText && styles.termsTextLarge]}>
                {tf('auth.termsPrefix', 'I agree to the ')}
                <Text
                  style={[styles.linkText, { color: colors.primary }]}
                  onPress={() => navigation.navigate('Terms')}
                >
                  {t('settings.termsOfService') || 'Terms of Service'}
                </Text>
                <Text>{' '}{tf('auth.and', 'and')} </Text>
                <Text
                  style={[styles.linkText, { color: colors.primary }]}
                  onPress={() => navigation.navigate('Privacy')}
                >
                  {t('settings.privacyPolicy') || 'Privacy Policy'}
                </Text>
                .
              </Text>
            </View>

            <TouchableOpacity
              disabled={submitting}
              style={[styles.signupButton, { backgroundColor: colors.surface }]}
              onPress={handleSignup}
            >
              <Text style={[styles.signupButtonText, { color: colors.primary }, largeText && styles.signupButtonTextLarge]}>
                {submitting ? tf('common.loading', 'Loading...') : tf('auth.signup', 'Sign up')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLinkContainer}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={[styles.loginLinkText, { color: colors.text }, largeText && styles.loginLinkTextLarge]}>
                {tf('auth.haveAccount', 'Already have an account? Log in')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  headerBlock: {
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  titleLarge: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 14,

  },
  subtitleLarge: {
    fontSize: 16,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    borderRadius: 12,
    padding: 14,
    paddingRight: 48,
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 4,
  },
  inputLarge: {
    fontSize: 18,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,

  },
  termsText: {
    flex: 1,
    fontSize: 12,
  },
  termsTextLarge: {
    fontSize: 14,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  signupButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupButtonTextLarge: {
    fontSize: 20,
  },
  loginLinkContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
  },
  loginLinkTextLarge: {
    fontSize: 16,
  },
});

export default SignupScreen;
