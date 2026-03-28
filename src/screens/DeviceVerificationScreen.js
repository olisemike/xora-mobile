import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function DeviceVerificationScreen({ route, navigation }) {
  const { verifyDevice } = useAuth();
  const { email, tempToken } = route.params || {};
  const { colors } = useTheme();

  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-character verification code.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyDevice(verificationCode, tempToken);

      if (result.success) {
        Alert.alert(
          'Success',
          'Device verified! Welcome to Xora Social.',
          [{ text: 'OK', onPress: () => navigation.replace('Main') }],
        );
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid or expired code.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to verify device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    Alert.alert(
      'Resend Code',
      'Please log out and log in again to receive a new verification code.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => navigation.replace('Login') },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Device Verification</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          A verification code has been sent to:
        </Text>
        <Text style={[styles.email, { color: colors.text }]}>{email || 'your email'}</Text>

        <Text style={[styles.instruction, { color: colors.textSecondary }] }>
          Enter the 6-character code to verify this device:
        </Text>

        <TextInput
          autoFocus
          autoCapitalize="characters"
          editable={!loading}
          maxLength={6}
          placeholder="Enter code (e.g., A1B2C3)"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={verificationCode}
          onChangeText={(text) => setVerificationCode(text.toUpperCase())}
        />

        <TouchableOpacity
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.surface }, loading && [styles.buttonDisabled, { backgroundColor: colors.border }]]}
          onPress={handleVerify}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primary }]}>Verify Device</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          style={styles.resendButton}
          onPress={handleResendCode}
        >
          <Text style={[styles.resendText, { color: colors.primary }]}>Didn’t receive the code?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          style={styles.cancelButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel and Logout</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 20,
  },
  button: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  resendText: {
    fontSize: 14,
  },
  cancelButton: {
    padding: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
  },
});
