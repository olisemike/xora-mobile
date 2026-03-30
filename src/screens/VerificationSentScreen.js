import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

const VerificationSentScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const email = route?.params?.email;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Check your email</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          We just sent a verification / reset email to:
        </Text>
        {email ? <Text style={[styles.email, { color: colors.text }]}>{email}</Text> : null}
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          In a real app, follow the link in that email to continue.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('VerificationCode', { email })}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>Enter code manually</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  content: { padding: 16 },
  text: { fontSize: 14, marginBottom: 8 },
  email: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  button: {
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 14 },
});

export default VerificationSentScreen;
