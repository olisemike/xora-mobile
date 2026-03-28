import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useNetwork } from '../contexts/NetworkContext';

const OfflineBanner = () => {
  const { t } = useTranslation();
  const { isOnline, globalError, clearError } = useNetwork();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when network status changes or error is set
  useEffect(() => {
    setDismissed(false);
  }, [isOnline, globalError]);

  if (isOnline && !globalError) {
    return null;
  }

  if (dismissed && !globalError) {
    return null;
  }

  const message =
    globalError ||
    t('common.offline') ||
    'You are offline. Some actions may not work.';

  const handleDismiss = () => {
    clearError();
    setDismissed(true);
  };

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      <Text numberOfLines={2} style={styles.text}>
        {message}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleDismiss}>
        <Text style={styles.buttonText}>
          {t('common.dismiss') || 'Dismiss'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f57c00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offline: {
    backgroundColor: '#d32f2f',
  },
  text: {
    flex: 1,
    color: 'white',
    fontSize: 13,
  },
  button: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineBanner;
