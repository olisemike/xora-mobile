import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const VerifyEmailScreen = ({ navigation, route }) => {
  const { tempToken, email, type: _type } = route?.params || {};
  const { colors } = useTheme();
  const { completeSignup } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    if (!tempToken) {
      Alert.alert('Session Expired', 'Please try signing up again.');
      navigation.replace('Signup');
      return;
    }

    setLoading(true);
    try {
      // Call API to verify email
      const result = await api.completeSignup(tempToken, code);

      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      if (result.emailVerified && result.email) {
        // Email verified - route to Sign In for device verification
        Alert.alert(
          'Email Verified!',
          'Your email has been verified. Please sign in to complete device verification.',
          [{ 
            text: 'OK', 
            onPress: () => navigation.replace('Login', { 
              email: result.email,
              fromEmailVerification: true,
              signupVerificationToken: result.signupVerificationToken 
            })
          }],
        );
      } else {
        throw new Error('Email verification incomplete');
      }
    } catch (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!tempToken) {
      Alert.alert('Session Expired', 'Please try signing up again.');
      navigation.replace('Signup');
      return;
    }

    setResending(true);
    try {
      const result = await api.resendSignupVerification(tempToken);

      if (result.success) {
        Alert.alert('Code Sent', result.message || 'A new verification code has been sent to your email.');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <LinearGradient colors={[colors.primary, colors.background]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons color={colors.text} name="mail-outline" size={64} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Verify Your Email
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We've sent a 6-digit verification code to
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>
            {email || 'your email'}
          </Text>

          <View style={styles.formContainer}>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text },
              ]}
              textAlign="center"
              value={code}
              onChangeText={setCode}
            />

            <TouchableOpacity
              disabled={loading}
              style={[styles.verifyButton, { backgroundColor: colors.surface }]}
              onPress={handleVerify}
            >
              <Text style={[styles.verifyButtonText, { color: colors.primary }]}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                Didn't receive the code?
              </Text>
              <TouchableOpacity disabled={resending} onPress={handleResend}>
                <Text style={[styles.resendLink, { color: colors.primary }]}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    marginBottom: 16,
  },
  verifyButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VerifyEmailScreen;
