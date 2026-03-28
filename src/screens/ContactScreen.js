import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

const ContactScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const handleEmailPress = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Us</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Get in Touch</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We’re here to help! Whether you have questions, need support, or want to report an issue, reach out
          to us through the appropriate channel below.
        </Text>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons color={colors.primary} name="mail-outline" size={24} style={styles.icon} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>General Support</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            For general inquiries, account help, and technical support
          </Text>
          <TouchableOpacity onPress={() => handleEmailPress('support@xorasocial.com')}>
            <Text style={[styles.emailLink, { color: colors.primary }]}>support@xorasocial.com</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons color={colors.primary} name="flag-outline" size={24} style={styles.icon} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Report Issues</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            Report abuse, harassment, copyright violations, and content complaints
          </Text>
          <TouchableOpacity onPress={() => handleEmailPress('report@xorasocial.com')}>
            <Text style={[styles.emailLink, { color: colors.primary }]}>report@xorasocial.com</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons color={colors.primary} name="megaphone-outline" size={24} style={styles.icon} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Advertising & Partnerships</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            For advertising inquiries, business partnerships, and brand collaborations
          </Text>
          <TouchableOpacity onPress={() => handleEmailPress('advertise@xorasocial.com')}>
            <Text style={[styles.emailLink, { color: colors.primary }]}>advertise@xorasocial.com</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons color={colors.primary} name="shield-checkmark-outline" size={24} style={styles.icon} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Privacy Matters</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            For data privacy questions, GDPR requests, and data protection concerns
          </Text>
          <TouchableOpacity onPress={() => handleEmailPress('privacy@xorasocial.com')}>
            <Text style={[styles.emailLink, { color: colors.primary }]}>privacy@xorasocial.com</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons color={colors.primary} name="document-text-outline" size={24} style={styles.icon} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Legal Notices</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            For legal matters, DMCA takedown notices, subpoenas, and official complaints
          </Text>
          <TouchableOpacity onPress={() => handleEmailPress('legal@xorasocial.com')}>
            <Text style={[styles.emailLink, { color: colors.primary }]}>legal@xorasocial.com</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons color={colors.primary} name="copy-outline" size={24} style={styles.icon} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Copyright Complaints</Text>
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            For DMCA takedown requests and intellectual property infringement reports
          </Text>
          <TouchableOpacity onPress={() => handleEmailPress('copyright@xorasocial.com')}>
            <Text style={[styles.emailLink, { color: colors.primary }]}>copyright@xorasocial.com</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Before reaching out, you might find answers to common questions in our Help & Support section.
          Visit Settings {'>'} Help & Support for quick solutions to common issues including:
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Account recovery and password reset{'\n'}
          • Privacy settings and account security{'\n'}
          • Content posting and moderation guidelines{'\n'}
          • Feature tutorials and how-to guides
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Response Time</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We aim to respond to all inquiries within 24-48 hours during business days. Complex issues may
          require additional time for investigation.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          For urgent security, safety, or abuse issues, please use the report@xorasocial.com email for faster
          assistance. Critical safety concerns are prioritized and reviewed immediately.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>In-App Reporting</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          For content-specific issues (posts, comments, messages, profiles), you can also use the in-app
          reporting tools:
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Tap the three-dot menu (•••) on any post, comment, or profile{'\\n'}
          • Select ‘Report’{'\\n'}
          • Choose the appropriate reason for reporting{'\\n'}
          • Provide additional context if needed
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          In-app reports are reviewed by our moderation team and action is taken in accordance with our
          Terms of Use and Community Guidelines.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Social Media</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Follow us for updates, announcements, and community news:{'\n\n'}
          Twitter: @XoraSocial (coming soon){'\n'}
          Instagram: @XoraSocial (coming soon){'\n'}
          Official Page on Xora Social: @xora
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Language Support</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Currently, support is available in English. We’re working to expand language support in the future.
          If you need assistance in another language, please let us know in your message and we’ll do our
          best to accommodate.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thank You</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Thank you for being part of the Xora Social community. Your feedback helps us improve the platform
          for everyone. We look forward to hearing from you!
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>
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
    paddingTop: 32,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  paragraph: { fontSize: 15, marginBottom: 12, lineHeight: 22 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  contactCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailLink: {
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default ContactScreen;
