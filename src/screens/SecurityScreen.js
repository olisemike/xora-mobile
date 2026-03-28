import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const SecurityScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const { isOnline, registerError } = useNetwork();
  const { token, logout } = useAuth();
  const { colors } = useTheme();

  const { twoFactorEnabled } = settings;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [qrInfo, setQrInfo] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(null);
  const [backupCodesLoading, setBackupCodesLoading] = useState(false);
  const [backupCodesRegenerating, setBackupCodesRegenerating] = useState(false);

  const handleChangePassword = async () => {
    if (submitting) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('security.missingFields') || 'Please fill all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('security.passwordTooShort') || 'New password is too short.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('security.passwordMismatch') || 'Passwords do not match.');
      return;
    }

    if (!isOnline) {
      const msg = t('security.offlineWarning') || 'Password change requires a network connection.';
      registerError(msg);
      Alert.alert(t('common.error'), msg);
      return;
    }

    if (!token) {
      Alert.alert(t('common.error'), 'You must be logged in to change your password.');
      return;
    }

    try {
      setSubmitting(true);
      await api.changePassword(token, currentPassword, newPassword);
      Alert.alert(t('security.title') || 'Security', t('security.changePasswordSuccess') || 'Password updated.', [
        {
          text: 'OK',
          onPress: async () => {
            // After password change, user should re-authenticate with new password
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert(t('common.error'), e.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('security.title') || 'Security'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('security.twoFactor') || 'Two-factor authentication'}</Text>
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: colors.text }]}>{t('security.twoFactorLabel') || 'Require code on login'}</Text>
            <Switch
              value={twoFactorEnabled}
              onValueChange={async (value) => {
                if (value) {
                  if (!token) {
                    Alert.alert(t('common.error'), 'You must be logged in to enable 2FA.');
                    return;
                  }
                  try {
                    setTwoFALoading(true);
                    const info = await api.enable2FA(token);
                    setQrInfo(info);
                    updateSettings({ twoFactorEnabled: true });
                  } catch (e) {
                    Alert.alert(t('common.error'), e.message || 'Failed to start 2FA setup');
                  } finally {
                    setTwoFALoading(false);
                  }
                } else {
                  if (!token) {
                    Alert.alert(t('common.error'), 'You must be logged in to disable 2FA.');
                    return;
                  }
                  if (!disablePassword || !disableCode) {
                    Alert.alert(
                      t('common.error'),
                      'Enter your password and a valid 2FA code below to turn off 2FA.',
                    );
                    return;
                  }
                  try {
                    setTwoFALoading(true);
                    await api.disable2FA(token, disablePassword, disableCode);
                    updateSettings({ twoFactorEnabled: false });
                    setQrInfo(null);
                    setSetupCode('');
                    setDisablePassword('');
                    setDisableCode('');
                    setBackupCodesRemaining(null);
                    Alert.alert('2FA disabled', 'Two-factor authentication has been turned off.');
                  } catch (e) {
                    Alert.alert(t('common.error'), e.message || 'Failed to disable 2FA');
                  } finally {
                    setTwoFALoading(false);
                  }
                }
              }}
            />
          </View>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {t('security.twoFactorHint') ||
              'Scan the QR code with your authenticator app and enter the code to finish setup.'}
          </Text>
          {qrInfo?.qrCodeUri ? (
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              OTP URI: {qrInfo.qrCodeUri}
            </Text>
          ) : null}
          {qrInfo ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.label, { color: colors.text }]}>Enter 6-digit code from your authenticator app:</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={setupCode}
                onChangeText={setSetupCode}
              />
              <TouchableOpacity
                disabled={twoFALoading}
                style={[styles.button, { backgroundColor: colors.surface }, twoFALoading && { opacity: 0.7 }]}
                onPress={async () => {
                  if (!setupCode.trim()) {
                    Alert.alert(t('common.error'), 'Enter the 2FA code to complete setup.');
                    return;
                  }
                  try {
                    setTwoFALoading(true);
                    await api.verify2FASetup(token, setupCode.trim());
                    Alert.alert('2FA enabled', 'Two-factor authentication is now enabled.');
                    setQrInfo(null);
                    setSetupCode('');
                    updateSettings({ twoFactorEnabled: true });
                  } catch (e) {
                    Alert.alert(t('common.error'), e.message || 'Failed to verify 2FA code');
                  } finally {
                    setTwoFALoading(false);
                  }
                }}
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>
                  {twoFALoading ? t('common.loading') : 'Verify 2FA setup'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {twoFactorEnabled ? (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Disable 2FA</Text>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Enter your password and a current 2FA code to turn off two-factor authentication.
              </Text>
              <TextInput
                secureTextEntry
                placeholder="Current password"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={disablePassword}
                onChangeText={setDisablePassword}
              />
              <TextInput
                keyboardType="number-pad"
                maxLength={6}
                placeholder="2FA code"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={disableCode}
                onChangeText={setDisableCode}
              />
            </View>
          ) : null}

          {twoFactorEnabled ? (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Backup codes</Text>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Backup codes let you access your account if you lose your authenticator app.
              </Text>
              {backupCodesRemaining !== null ? (
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Remaining backup codes: {backupCodesRemaining}
                </Text>
              ) : null}
              <View style={styles.rowBetween}>
                <TouchableOpacity
                  disabled={backupCodesLoading}
                  style={[styles.button, { backgroundColor: colors.surface }, backupCodesLoading && { opacity: 0.7 }]}
                  onPress={async () => {
                    if (!token) {
                      Alert.alert(t('common.error'), 'You must be logged in to view backup codes.');
                      return;
                    }
                    try {
                      setBackupCodesLoading(true);
                      const remaining = await api.getBackupCodesCount(token);
                      setBackupCodesRemaining(remaining);
                    } catch (e) {
                      Alert.alert(t('common.error'), e.message || 'Failed to load backup code status');
                    } finally {
                      setBackupCodesLoading(false);
                    }
                  }}
                >
                  <Text style={[styles.buttonText, { color: colors.primary }]}>
                    {backupCodesLoading ? t('common.loading') : 'Refresh status'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={backupCodesRegenerating}
                  style={[styles.button, { backgroundColor: colors.surface }, backupCodesRegenerating && { opacity: 0.7 }]}
                  onPress={async () => {
                    if (!token) {
                      Alert.alert(t('common.error'), 'You must be logged in to regenerate backup codes.');
                      return;
                    }
                    if (!disablePassword || !disableCode) {
                      Alert.alert(
                        t('common.error'),
                        'Enter your password and a valid 2FA code above to regenerate backup codes.',
                      );
                      return;
                    }
                    try {
                      setBackupCodesRegenerating(true);
                      const codes = await api.regenerateBackupCodes(token, disablePassword, disableCode);
                      setBackupCodesRemaining(codes.length);
                      Alert.alert(
                        'Backup codes regenerated',
                        'New backup codes have been generated. Store them somewhere safe.',
                      );
                    } catch (e) {
                      Alert.alert(t('common.error'), e.message || 'Failed to regenerate backup codes');
                    } finally {
                      setBackupCodesRegenerating(false);
                    }
                  }}
                >
                  <Text style={[styles.buttonText, { color: colors.primary }]}>
                    {backupCodesRegenerating ? t('common.loading') : 'Regenerate codes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('security.changePassword') || 'Change password'}</Text>
          <TextInput
            secureTextEntry
            placeholder={t('security.currentPassword') || 'Current password'}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TextInput
            secureTextEntry
            placeholder={t('security.newPassword') || 'New password'}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            secureTextEntry
            placeholder={t('security.confirmPassword') || 'Confirm new password'}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {!isOnline ? (
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              {t('security.offlineWarning') || 'Changes will be synced when online.'}
            </Text>
          ) : null}
          <TouchableOpacity
            disabled={submitting}
            style={[styles.button, { backgroundColor: colors.surface }, submitting && { opacity: 0.7 }]}
            onPress={handleChangePassword}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              {submitting ? t('common.loading') : t('security.save') || 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
    paddingBottom: 24,
  },
  section: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  button: {
    marginTop: 8,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SecurityScreen;
