import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

const TermsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Use</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.effectiveDate, { color: colors.textSecondary }]}>
          Effective Date: 1st of December, 2025{'\n'}
          Last Updated: 1st of December, 2025
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Introduction and Binding Agreement</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Welcome to Xora Social (“Platform”), a social networking platform operated by Xora Social
          (“Company,” “we,” “us,” or “our”). These Terms of Use (“Terms”) constitute a legally
          binding agreement between you (“User,” “you,” or “your”) and the Company governing your access to and
          use of the Platform.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          By creating an account, accessing, browsing, or otherwise using the Platform, you acknowledge that you
          have read, understood, and agreed to be bound by these Terms, our Privacy Policy, and any supplemental
          policies incorporated by reference.
        </Text>
        <Text style={[styles.strong, { color: colors.text }]}>
          If you do not agree, you must not access or use the Platform.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Scope of Services</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          The Platform provides a digital environment enabling users to: Create personal profiles, publish text,
          image, and video content, interact through comments, likes, and follows, exchange private messages,
          publish temporary content (stories), publish video content (reels), discover content and users through
          search and recommendations, and receive system notifications.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We reserve the right to modify, suspend, or discontinue any part of the Platform at any time without
          prior notice or liability.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Eligibility, Age, and Legal Capacity</Text>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>3.1 Minimum Age</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          You must be at least 13 years old, or the minimum age required by your jurisdiction, whichever is higher,
          to use the Platform.
        </Text>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>3.2 Minors (Under 18)</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          If you are under 18 years of age: You confirm that your use of the Platform is lawful in your jurisdiction,
          and you represent that you have obtained any required parental or guardian consent.
        </Text>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>3.3 Prohibited Users</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          You may not use the Platform if: You are legally prohibited from receiving services under applicable law,
          you have been permanently suspended from the Platform for prior violations, or your use would violate
          export control or sanctions laws.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Account Registration and Integrity</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          You agree to provide accurate, current, and complete information during registration and to promptly
          update such information. Unless expressly authorized in writing by the Company, users may not create
          or operate multiple accounts for deceptive, abusive, or ban-evasion purposes.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          You are solely responsible for maintaining the confidentiality of your login credentials and all actions
          occurring under your account, whether authorized by you or not. Notify us immediately of any suspected
          unauthorized use.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Content Visibility and Privacy Controls</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          By default, content posted to the Platform is publicly accessible. Users may enable account-level privacy
          controls to restrict visibility (e.g., private account settings). Private messages are intended to be
          visible only to designated participants.
        </Text>
        <Text style={[styles.strong, { color: colors.text }]}>
          We do not guarantee absolute confidentiality of any content. Users should exercise discretion when
          posting sensitive or private information.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. User Content: Ownership and License</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          You retain all ownership rights in content you create and upload to the Platform (“User Content”).
          By submitting User Content, you grant the Company a worldwide, perpetual (for operational needs),
          royalty-free, sublicensable, transferable license to host, store, reproduce, display, adapt, distribute,
          and create derivative works from User Content solely for the purpose of operating, improving, promoting,
          and securing the Platform.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Content Standards and Prohibited Conduct</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Users may not post, upload, transmit, or engage in content or behavior that: Violates any applicable
          law or regulation, infringes on the intellectual property rights of others, contains hate speech,
          harasses, threatens, bullies, or intimidates any individual or group, exploits or harms minors,
          promotes or glorifies violence, terrorism, or extremism, contains malware, viruses, scripts, or
          exploits, engages in spam, phishing, fraud, or impersonation, or attempts to circumvent platform
          safeguards, access restrictions, or moderation systems.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Moderation and Enforcement</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          The Platform functions as an interactive computer service. We are not the publisher or speaker of
          User Content. We reserve the right, but assume no obligation, to remove or restrict access to content,
          limit content visibility or distribution, suspend or terminate user accounts with or without notice,
          and take any action we deem necessary to comply with law, protect the Platform, or preserve user safety.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>14. Disclaimers of Warranties</Text>
        <Text style={[styles.strong, { color: colors.text }]}>
          THE PLATFORM IS PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT WARRANTIES OF ANY KIND.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
          BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
          AND NON-INFRINGEMENT.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>15. Limitation of Liability</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          TO THE FULLEST EXTENT PERMITTED BY LAW: THE COMPANY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES,
          AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING FROM YOUR USE OF THE PLATFORM IS CAPPED AT THE
          GREATER OF: USD $100, OR THE AMOUNT YOU PAID TO US (IF ANY) IN THE 12 MONTHS PRIOR TO THE EVENT GIVING
          RISE TO LIABILITY.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>30. Contact for Legal Notices</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Legal notices, including copyright complaints, subpoenas, and formal complaints, must be sent to:
          legal@xorasocial.com
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>31. Acknowledgment and Acceptance</Text>
        <Text style={[styles.strong, { color: colors.text }]}>
          BY CLICKING “ACCEPT,” CREATING AN ACCOUNT, OR USING THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ
          AND UNDERSTOOD THESE TERMS AND AGREE TO BE BOUND BY THEM.
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
  effectiveDate: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  paragraph: { fontSize: 15, marginBottom: 12, lineHeight: 22 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  strong: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
});

export default TermsScreen;
