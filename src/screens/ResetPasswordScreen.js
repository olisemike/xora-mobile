import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const ResetPasswordScreen = ({ navigation, route }) => {
  const email = route?.params?.email;
  const code = route?.params?.code;
  const { isOnline, registerError } = useNetwork();
  const { logout } = useAuth();
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirm) {
      Alert.alert('Error', 'Please fill both password fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password is too short');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!email || !code) {
      Alert.alert('Error', 'Missing reset information. Please request a new reset email.');
      return;
    }

    if (!isOnline) {
      const msg = 'You appear to be offline. Password reset requires a connection.';
      registerError(msg);
      Alert.alert('Error', msg);
      return;
    }

    try {
      setLoading(true);
      await api.resetPassword(email, code, password);
      // Clear any existing auth state after password reset
      await logout();
      Alert.alert('Success', 'Password reset. Please log in with your new password.', [
        {
          text: 'OK',
          onPress: () => {
            // Reset navigation stack to Login with no back option
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reset password</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {email ? <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text> : null}
        <TextInput
          secureTextEntry
          placeholder="New password"
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          secureTextEntry
          placeholder="Confirm new password"
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={confirm}
          onChangeText={setConfirm}
        />
        <TouchableOpacity disabled={loading} style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleReset}>
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {loading ? 'Saving...' : 'Save new password'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  email: { fontSize: 14, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});

export default ResetPasswordScreen;
