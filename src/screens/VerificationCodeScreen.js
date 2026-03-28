import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

const VerificationCodeScreen = ({ navigation, route }) => {
  const email = route?.params?.email;
  const [code, setCode] = useState('');
  const { colors } = useTheme();

  const handleVerify = () => {
    if (!code) {
      Alert.alert('Missing code', 'Enter the 6-digit code you received in email.');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the full 6-digit code.');
      return;
    }

    // Pass both email and code into ResetPasswordScreen so it can call the real API
    navigation.navigate('ResetPassword', { email, code });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Enter verification code</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.textSecondary }] }>
          Enter the 6-digit code we sent to your email.
        </Text>
        {email ? <Text style={[styles.email, { color: colors.text }] }>{email}</Text> : null}
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={code}
          onChangeText={setCode}
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface }]} onPress={handleVerify}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>Verify</Text>
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    marginBottom: 12,
    letterSpacing: 4,
    textAlign: 'center',
  },
  button: {
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});

export default VerificationCodeScreen;
