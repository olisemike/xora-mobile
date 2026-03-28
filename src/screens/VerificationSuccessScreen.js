import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

const VerificationSuccessScreen = ({ navigation }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}>
          <Ionicons color={colors.text} name="close" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Success</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Ionicons color={colors.primary} name="checkmark-circle" size={80} style={{ marginBottom: 16 }} />
        <Text style={[styles.title, { color: colors.text }]}>Password updated</Text>
        <Text style={[styles.text, { color: colors.textSecondary }] }>
          Your password has been updated successfully. Use your new password to log in.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface }]} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>Back to login</Text>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  text: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  button: {
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});

export default VerificationSuccessScreen;
