import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useSettings } from '../contexts/SettingsContext';
import { useModeration } from '../contexts/ModerationContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useTheme } from '../contexts/ThemeContext';

const REASONS = ['spam', 'abuse', 'nudity', 'misinformation', 'other'];

export default function ReportScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { submitReport } = useModeration();
  const { isOnline, registerError } = useNetwork();
  const { colors } = useTheme();
  const largeText = settings.textSizeLarge;
  const { reduceMotion } = settings;

  const { entityType = 'post', entityId, summary } = route.params || {};
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Map field names to match submitReport expectations
      await submitReport({
        targetType: entityType,
        targetId: entityId,
        category: reason,
        description: details,
      });

      // Show success message
      const message = t('report.submitted') || 'Report submitted successfully.';

      if (!reduceMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      const successTitle = t('common.success');
      const safeSuccessTitle = successTitle && !successTitle.startsWith('common.')
        ? successTitle
        : 'Success';

      Alert.alert(safeSuccessTitle, message, [
        {
          text: t('common.dismiss') || 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      if (__DEV__) console.error('Report submission error:', error);
      registerError(error.message || 'Failed to submit report. Please try again.');

      if (!reduceMotion) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }

      Alert.alert(
        t('common.error') || 'Error',
        error.message || 'Failed to submit report. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const titleKey = entityType === 'user' ? 'report.titleUser' : 'report.titlePost';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, largeText && styles.headerTitleLarge]}>
          {t(titleKey)}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {summary ? (
          <View style={[styles.summaryBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }, largeText && styles.summaryLabelLarge]}>
              {t('report.about') || 'About'}
            </Text>
            <Text style={[styles.summaryText, { color: colors.text }, largeText && styles.summaryTextLarge]}>{summary}</Text>
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.text }, largeText && styles.labelLarge]}>
          {t('report.reason') || 'Why are you reporting this?'}
        </Text>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.reasonRow, { backgroundColor: colors.surface }, reason === r && [styles.reasonRowActive, { borderColor: colors.primary }]]}
            onPress={() => setReason(r)}
          >
            <View style={styles.reasonLeft}>
              <Ionicons
                color={reason === r ? colors.primary : colors.textSecondary}
                name={reason === r ? 'radio-button-on' : 'radio-button-off'}
                size={20}
              />
              <Text style={[styles.reasonText, { color: colors.text }, largeText && styles.reasonTextLarge]}>
                {t(`report.reason.${r}`) || r}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.label, { color: colors.text }, largeText && styles.labelLarge]}>
          {t('report.additionalInfo') || 'Additional details (optional)'}
        </Text>
        <TextInput
          multiline
          placeholder={t('report.placeholder') || 'Describe the issue...'}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, largeText && styles.inputLarge]}
          value={details}
          onChangeText={setDetails}
        />

        {!isOnline ? (
          <Text style={[styles.offlineNote, { color: colors.textSecondary }, largeText && styles.offlineNoteLarge]}>
            {t('common.offline') || 'You are offline. This report will only be stored locally for now.'}
          </Text>
        ) : null}

        <TouchableOpacity
          disabled={submitting}
          style={[styles.submitButton, { backgroundColor: colors.surface }, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
        >
          <Text style={[styles.submitButtonText, { color: colors.primary }, largeText && styles.submitButtonTextLarge]}>
            {submitting ? t('common.loading') : t('report.submit') || 'Submit report'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',

  },
  headerTitleLarge: {
    fontSize: 20,
  },
  content: {
    padding: 15,
    paddingBottom: 40,
  },
  summaryBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryLabelLarge: {
    fontSize: 15,
  },
  summaryText: {
    fontSize: 14,
  },
  summaryTextLarge: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelLarge: {
    fontSize: 16,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  reasonRowActive: {
    borderWidth: 1,

  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonText: {
    marginLeft: 8,
    fontSize: 14,

  },
  reasonTextLarge: {
    fontSize: 16,
  },
  input: {
    minHeight: 100,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  inputLarge: {
    fontSize: 16,
  },
  offlineNote: {
    fontSize: 12,
    marginBottom: 12,
  },
  offlineNoteLarge: {
    fontSize: 14,
  },
  submitButton: {
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitButtonTextLarge: {
    fontSize: 17,
  },
});
