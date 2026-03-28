import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

const PrivacyScreen = ({ navigation }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.effectiveDate, { color: colors.textSecondary }]}>
          Effective Date: 1st of December, 2025{'\n'}
          Last Updated: 1st of December, 2025
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Purpose and Regulatory Alignment</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          This Privacy Policy explains how Xora Social (“Platform”), operated by Automatons mobility and software
          services (“Company”), collects, uses, stores, shares, and protects personal information. This Policy is
          intended to comply with GDPR / UK GDPR, CCPA / CPRA, LGPD (Brazil), PIPEDA (Canada), and other applicable
          data protection and privacy laws globally.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          By using the Platform, you consent to the data practices described in this Policy. If you do not agree,
          you must not access or use the Platform.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Categories of Data We Collect</Text>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.1 Account and Profile Data</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Username{'\n'}
          • Email address{'\n'}
          • Display name{'\n'}
          • Profile picture and bio{'\n'}
          • Optional contact information (if provided by user)
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.2 Content Data</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Posts, comments, and replies{'\n'}
          • Messages and conversations{'\n'}
          • Images, videos, and other uploaded media{'\n'}
          • Stories and reels
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.3 Interaction Data</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Likes, shares, bookmarks, and follows{'\n'}
          • Search queries{'\n'}
          • User-to-user interactions (e.g., tags, mentions)
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.4 Log and Technical Data</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • IP address{'\n'}
          • Device information (operating system, browser type, device ID){'\n'}
          • Timestamps of activity{'\n'}
          • Session tokens and cookies{'\n'}
          • Abuse and security signals (e.g., failed login attempts, reported content)
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.5 Push Notification Tokens</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Expo push tokens (for mobile notifications){'\n'}
          • VAPID tokens (for web push notifications)
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>2.6 Data We Do NOT Collect</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We do not currently collect:{'\n'}
          • Precise geolocation data{'\n'}
          • Behavioral analytics or advertising identifiers{'\n'}
          • Sensitive personal data (government IDs, biometric data, health data) unless voluntarily shared
          by users in content
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. How We Collect Data</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Directly from You: When you register, post content, or interact with features{'\n'}
          • Automatically: Through cookies, logs, and device telemetry when you use the Platform{'\n'}
          • From Other Users: When users tag, mention, or interact with your content
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Purposes of Processing</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We use your data for the following purposes:{'\n'}
          • Service Provision: To operate the Platform, authenticate users, and deliver features{'\n'}
          • Security and Fraud Prevention: To detect abuse, enforce Terms of Use, prevent spam, and protect user safety{'\n'}
          • Legal Compliance: To comply with applicable laws, respond to lawful government requests, and enforce our rights{'\n'}
          • Communications: To send notifications, updates, and support messages (subject to user preferences){'\n'}
          • Platform Integrity: To monitor and improve content quality, combat misinformation, and maintain community standards{'\n'}
          • Advertising: To display ads (currently without behavioral targeting or profiling)
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Legal Bases for Processing (GDPR)</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          For users in the EU/UK, we process personal data based on the following lawful bases:{'\n'}
          • Contractual Necessity: To perform the contract (Terms of Use) between you and us{'\n'}
          • Legitimate Interest: For security, fraud prevention, and Platform improvement (balanced against user rights){'\n'}
          • Legal Obligation: To comply with laws and regulatory requirements{'\n'}
          • Consent: Where you have explicitly consented (e.g., push notifications, marketing communications)
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Advertising and Profiling Disclosure</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Current Practice: Advertisements may be displayed on the Platform, but we do not currently engage in
          behavioral profiling or targeted advertising based on user behavior.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Future Changes: If we implement behavioral advertising or profiling, we will update this Policy and
          provide opt-out mechanisms as required by law (e.g., GDPR Article 21 objection right, CCPA opt-out).
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Data Sharing and Disclosure</Text>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.1 We Do NOT Sell Personal Data</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We do not sell personal data to third parties for monetary or other valuable consideration.
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.2 Sharing with Service Providers</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We may share data with trusted service providers who assist us in operating the Platform, including:{'\n'}
          • Infrastructure Providers: Cloudflare (hosting, databases, CDN, security){'\n'}
          • Storage Providers: Cloudflare R2 (media and data storage){'\n'}
          • Push Notification Services: Expo (mobile push notifications){'\n\n'}
          These providers are contractually bound to use data only for specified purposes and to protect it.
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.3 Legal and Safety Disclosures</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We may disclose data when required or permitted by law, including:{'\n'}
          • In response to subpoenas, court orders, or lawful government requests{'\n'}
          • To prevent imminent harm, fraud, or violations of law{'\n'}
          • To enforce our Terms of Use and protect our rights{'\n'}
          • In connection with investigations of abuse or illegal activity
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.4 Corporate Transactions</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          In the event of a merger, acquisition, or sale of assets, user data may be transferred to a successor
          entity. You will be notified via email or prominent notice on the Platform.
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>7.5 Public Content</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Content you post publicly (including posts, comments, stories, and reels) may be viewed by anyone,
          including non-users and search engines. We have no control over how third parties use publicly available
          information.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>8. International Data Transfers</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          The Platform is operated from the United States, and data may be processed in the U.S. and other jurisdictions
          where our service providers operate. These jurisdictions may not provide the same level of data protection as
          your home country.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          For data transfers from the EU/UK to non-adequate countries, we rely on appropriate safeguards such as Standard
          Contractual Clauses (SCCs) approved by the European Commission or UK authorities.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Data Retention</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We retain personal data only as long as reasonably necessary to fulfill the purposes described in this Policy,
          comply with legal obligations, resolve disputes, and enforce our agreements.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Retention Periods:{'\n'}
          • Active Accounts: Data is retained as long as your account is active and operational{'\n'}
          • Deleted Accounts: Upon account deletion, most data is deleted within 90 days. Some data may be retained
          longer for legal compliance, fraud prevention, or security purposes (e.g., IP logs, moderation records){'\n'}
          • Archived Data: Data older than 18 months may be archived to long-term storage and deleted after legal
          retention periods expire{'\n'}
          • Backups: Data may persist in encrypted backups for up to 30 days after deletion
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>10. User Rights</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Depending on your jurisdiction, you may have the following rights:
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>10.1 GDPR / UK GDPR Rights (EU/UK Users)</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Right of Access: Request a copy of your personal data{'\\n'}
          • Right to Rectification: Correct inaccurate or incomplete data{'\\n'}
          • Right to Erasure (‘Right to be Forgotten’): Request deletion of your data (subject to legal exceptions){'\\n'}
          • Right to Restriction of Processing: Limit how we use your data in certain circumstances{'\\n'}
          • Right to Data Portability: Receive your data in a machine-readable format{'\\n'}
          • Right to Object: Object to processing based on legitimate interest{'\\n'}
          • Right to Withdraw Consent: Where processing is based on consent{'\\n'}
          • Right to Lodge a Complaint: File a complaint with a supervisory authority
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>10.2 CCPA / CPRA Rights (California Users)</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Right to Know: Request disclosure of categories and specific pieces of personal data collected{'\\n'}
          • Right to Delete: Request deletion of personal data (subject to exceptions){'\\n'}
          • Right to Opt-Out: Opt out of the “sale” or “sharing” of personal data (Note: We do not currently sell
          or share data for cross-context behavioral advertising){'\\n'}
          • Right to Correct: Correct inaccurate personal data{'\n'}
          • Right to Non-Discrimination: You will not be discriminated against for exercising your rights
        </Text>

        <Text style={[styles.subsectionTitle, { color: colors.text }]}>10.3 How to Exercise Your Rights</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          To exercise any of the above rights, please contact us at: privacy@xorasocial.com{'\n\n'}
          We may require verification of your identity before processing requests. Verification may involve
          confirming account ownership or providing additional information.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>11. Children’s Privacy (COPPA Compliance)</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          The Platform is not intended for children under 13 years of age (or the minimum age in your jurisdiction).
          We do not knowingly collect personal data from children under 13.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          If we become aware that we have collected data from a child under 13 without parental consent, we will take
          steps to delete such data promptly.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Parents or guardians who believe their child has provided personal data may contact us at support@xorasocial.com
          to request deletion.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>12. Security Measures</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We implement technical and organizational measures designed to protect personal data against unauthorized
          access, loss, misuse, alteration, or destruction, including:{'\n'}
          • Encryption of data in transit (HTTPS/TLS){'\n'}
          • Encryption of data at rest (database encryption){'\n'}
          • Access controls and authentication mechanisms{'\n'}
          • Regular security audits and monitoring{'\n'}
          • Secure coding practices and vulnerability management
        </Text>
        <Text style={[styles.strong, { color: colors.text }]}>
          No system is 100% secure. We cannot guarantee absolute security. You are responsible for protecting your
          login credentials and notifying us of any suspected unauthorized access.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>16. Sensitive Personal Data</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We do not intentionally collect sensitive personal data (such as government IDs, precise geolocation,
          biometric data, or health data).
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          User Responsibility: Users are strongly discouraged from voluntarily sharing sensitive data through public
          content or messages. We are not responsible for sensitive data users choose to disclose publicly.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>17. User-Generated Content and Public Visibility</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Content you post publicly (posts, comments, stories, reels) may be visible to anyone, including
          non-users, search engines, and third-party platforms.
        </Text>
        <Text style={[styles.strong, { color: colors.text }]}>
          We are not responsible for how third parties use publicly available information. Once content is shared
          publicly, it may be copied, reposted, or archived by third parties beyond our control.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Consider using privacy settings (e.g., private accounts, direct messages) for sensitive communications.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>20. Changes to This Privacy Policy</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We may update this Policy from time to time to reflect changes in our practices, legal requirements, or
          platform features. Changes will be posted on this page with an updated “Last Updated” date.
        </Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Material changes will be communicated via email or prominent in-app notification. Continued use of the
          Platform after changes constitutes acceptance of the updated Policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>26. Contact for Privacy Matters</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          For questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact
          us at:{'\n\n'}
          Email: privacy@xorasocial.com{'\n'}
          Legal Inquiries: legal@xorasocial.com{'\n\n'}
          We will respond to your inquiry within a reasonable timeframe (typically within 30 days, or as required
          by applicable law).
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>27. Acknowledgment</Text>
        <Text style={[styles.strong, { color: colors.text }]}>
          BY USING THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY AND AGREE
          TO ITS TERMS.
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

export default PrivacyScreen;
