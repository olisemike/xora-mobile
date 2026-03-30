import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useNetwork } from '../contexts/NetworkContext';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { isOnline, registerError } = useNetwork();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert(t('common.error'), 'Please enter your email');
      return;
    }

    if (!isOnline) {
      const msg = t('auth.offlineLogin') || 'You appear to be offline. Password reset requires a connection.';
      registerError(msg);
      Alert.alert(t('common.error'), msg);
      return;
    }

    try {
      setLoading(true);
      await api.forgotPassword(email.trim());
      Alert.alert(
        'Check your email',
        'If this email is registered, a reset code has been sent to you.',
      );
      navigation.navigate('VerificationSent', { email: email.trim() });
    } catch (e) {
      Alert.alert(t('common.error'), e.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }] } behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }] }>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.forgotPassword') || 'Forgot password'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.info, { color: colors.textSecondary }]}>
          Enter the email associated with your account. In a real app we would send you a reset link
          or code.
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('auth.email') || 'Email'}
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity disabled={loading} style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {loading ? t('common.loading') : 'Send reset code'}
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
  info: { fontSize: 14, marginBottom: 16 },
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

export default ForgotPasswordScreen;
