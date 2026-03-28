import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import api from '../services/api';

export default function TwoFactorSetupScreen({ navigation }) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { updateSettings } = useSettings();

  const [step, setStep] = useState('loading'); // 'loading', 'setup', 'verify', 'backup', 'complete'
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initiate2FASetup = useCallback(async () => {
    setStep('loading');
    setError(null);
    try {
      const result = await api.enable2FA(token);
      setQrCodeUrl(result.qrCode || result.qrCodeUrl || result.otpauth_url);
      setSecret(result.secret || result.secretKey || '');
      setStep('setup');
    } catch (err) {
      if (__DEV__) console.error('Failed to initiate 2FA setup:', err);
      setError(err.message || 'Failed to start 2FA setup');
      setStep('setup'); // Allow retry
    }
  }, [token]);

  useEffect(() => {
    initiate2FASetup();
  }, [initiate2FASetup]);

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await Clipboard.setStringAsync(secret);
      Alert.alert('Copied', 'Secret key copied to clipboard');
    } catch (_err) {
      Alert.alert('Error', 'Failed to copy secret key');
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Code required', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }

    if (verificationCode.length !== 6) {
      Alert.alert('Invalid code', 'Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.verify2FASetup(token, verificationCode.trim());

      // Check if backup codes were returned
      if (result?.backupCodes || result?.backup_codes) {
        setBackupCodes(result.backupCodes || result.backup_codes);
        setStep('backup');
      } else {
        // Try to get backup codes count
        try {
          const count = await api.getBackupCodesCount(token);
          if (count > 0) {
            setStep('complete');
          } else {
            setStep('complete');
          }
        } catch {
          setStep('complete');
        }
      }

      // Update settings to reflect 2FA is now enabled
      updateSettings({ twoFactorEnabled: true });
    } catch (err) {
      if (__DEV__) console.error('2FA verification failed:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    if (!backupCodes.length) return;
    try {
      await Clipboard.setStringAsync(backupCodes.join('\n'));
      Alert.alert('Copied', 'Backup codes copied to clipboard. Store them safely!');
    } catch (_err) {
      Alert.alert('Error', 'Failed to copy backup codes');
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Setup Complete',
      'Two-factor authentication is now enabled on your account.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const renderLoading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Setting up two-factor authentication...
      </Text>
    </View>
  );

  const renderSetup = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepActive, { backgroundColor: colors.primary }]} />
        <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
        <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
        <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
        <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        Set Up Two-Factor Authentication
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Scan the QR code below with your authenticator app (like Google Authenticator, Authy, or 1Password).
      </Text>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: `${colors.error}20` }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={initiate2FASetup}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {qrCodeUrl && (
        <View style={[styles.qrContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image
            source={{ uri: qrCodeUrl }}
            style={styles.qrCode}
            resizeMode="contain"
          />
        </View>
      )}

      <Text style={[styles.orText, { color: colors.textSecondary }]}>
        Or enter this key manually:
      </Text>

      <TouchableOpacity
        style={[styles.secretBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handleCopySecret}
      >
        <Text style={[styles.secretText, { color: colors.text }]} selectable>
          {secret || 'Loading...'}
        </Text>
        <Ionicons name="copy-outline" size={20} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => setStep('verify')}
        disabled={!secret}
      >
        <Text style={styles.buttonText}>I've Added the Code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderVerify = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepComplete, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
        <View style={[styles.stepLine, { backgroundColor: colors.success }]} />
        <View style={[styles.stepDot, styles.stepActive, { backgroundColor: colors.primary }]} />
        <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
        <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        Verify Your Setup
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enter the 6-digit code from your authenticator app to verify the setup.
      </Text>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: `${colors.error}20` }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <TextInput
        autoFocus
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.codeInput,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        value={verificationCode}
        onChangeText={setVerificationCode}
        editable={!loading}
      />

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          loading && styles.buttonDisabled,
        ]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify & Enable 2FA</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('setup')}
        disabled={loading}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to QR Code</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderBackup = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, styles.stepComplete, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
        <View style={[styles.stepLine, { backgroundColor: colors.success }]} />
        <View style={[styles.stepDot, styles.stepComplete, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
        <View style={[styles.stepLine, { backgroundColor: colors.success }]} />
        <View style={[styles.stepDot, styles.stepActive, { backgroundColor: colors.primary }]} />
      </View>

      <Ionicons name="shield-checkmark" size={60} color={colors.success} style={styles.successIcon} />

      <Text style={[styles.title, { color: colors.text }]}>
        Save Your Backup Codes
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
      </Text>

      <View style={[styles.codesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {backupCodes.map((code, index) => (
          <Text key={index} style={[styles.backupCode, { color: colors.text }]}>
            {code}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.copyButton, { borderColor: colors.primary }]}
        onPress={handleCopyBackupCodes}
      >
        <Ionicons name="copy-outline" size={20} color={colors.primary} />
        <Text style={[styles.copyButtonText, { color: colors.primary }]}>Copy All Codes</Text>
      </TouchableOpacity>

      <View style={[styles.warningBox, { backgroundColor: `${colors.warning}20` }]}>
        <Ionicons name="warning" size={20} color={colors.warning} />
        <Text style={[styles.warningText, { color: colors.warning }]}>
          Each backup code can only be used once. Keep them secure!
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleComplete}
      >
        <Text style={styles.buttonText}>I've Saved My Codes</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderComplete = () => (
    <View style={styles.centerContent}>
      <Ionicons name="shield-checkmark" size={80} color={colors.success} />
      <Text style={[styles.title, { color: colors.text, marginTop: 20 }]}>
        2FA Enabled!
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
        Two-factor authentication is now enabled on your account. You'll need to enter a code from your authenticator app when logging in.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary, marginTop: 30 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Two-Factor Authentication</Text>
        <View style={styles.headerButton} />
      </View>

      {step === 'loading' && renderLoading()}
      {step === 'setup' && renderSetup()}
      {step === 'verify' && renderVerify()}
      {step === 'backup' && renderBackup()}
      {step === 'complete' && renderComplete()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    transform: [{ scale: 1.1 }],
  },
  stepComplete: {
    // inherits background from inline style
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qrContainer: {
    alignSelf: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 12,
  },
  secretBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  secretText: {
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 12,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    fontSize: 15,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  backText: {
    fontSize: 15,
  },
  successIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  codesContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  backupCode: {
    fontSize: 14,
    fontFamily: 'monospace',
    padding: 8,
    width: '45%',
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
  },
});
