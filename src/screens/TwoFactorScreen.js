import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function TwoFactorScreen({ route }) {
  const { completeTwoFactorLogin } = useAuth();
  const { colors } = useTheme();
  const { email, tempToken, message } = route.params || {};

  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!tempToken) {
      Alert.alert('Session expired', 'Your 2FA session has expired. Please log in again.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Code required', 'Please enter your 2FA code or backup code.');
      return;
    }

    setLoading(true);
    try {
      await completeTwoFactorLogin(tempToken, code.trim(), { isBackupCode: useBackupCode });
      Alert.alert('Success', 'Two-factor authentication verified. Welcome back!', [{ text: 'OK' }]);
      // After auth state updates, App.js will automatically switch to the Main navigator
    } catch (error) {
      Alert.alert('Invalid code', error.message || 'The code you entered is not valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Two-Factor Authentication</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {message || 'Enter the code from your authenticator app to continue.'}
        </Text>
        {email ? (
          <Text style={[styles.email, { color: colors.text }]}>{email}</Text>
        ) : null}

        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          {useBackupCode
            ? 'Enter one of your backup codes:'
            : 'Enter the 6-digit code from your authenticator app:'}
        </Text>

        <TextInput
          autoFocus
          autoCapitalize="characters"
          editable={!loading}
          keyboardType={useBackupCode ? 'default' : 'number-pad'}
          maxLength={useBackupCode ? 32 : 6}
          placeholder={useBackupCode ? 'Backup code' : '123456'}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity
          disabled={loading}
          style={styles.toggleButton}
          onPress={() => setUseBackupCode(!useBackupCode)}
        >
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {useBackupCode
              ? 'Use authenticator app code instead'
              : 'Use a backup code instead'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={loading}
          style={[
            styles.button,
            { backgroundColor: colors.surface },
            loading && [styles.buttonDisabled, { backgroundColor: colors.border }],
          ]}
          onPress={handleVerify}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primary }]}>Verify & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 10,
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  button: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
