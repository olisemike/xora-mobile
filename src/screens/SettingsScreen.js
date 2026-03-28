import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import api from '../services/api';

const SettingsRow = ({ icon, label, onPress, showChevron = true }) => {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const largeText = settings.textSizeLarge;
  const { boldText } = settings;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons
          color={colors.primary}
          name={icon}
          size={22}
          style={styles.rowIcon}
        />
        <Text
          style={[
            styles.rowLabel,
            { color: colors.text },
            largeText && styles.rowLabelLarge,
            boldText && styles.rowLabelBold,
          ]}
        >
          {label}
        </Text>
      </View>
      {showChevron ? <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} /> : null}
    </TouchableOpacity>
  );
};

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const tf = (key, fallback) => {
    const v = t(key);
    return v === key ? (fallback || key) : v;
  };
  const { logout, token, logoutAllDevices } = useAuth();
  const { mode, updateMode, colors } = useTheme();
  const { settings, updateSettings } = useSettings();

  const [languagePickerVisible, setLanguagePickerVisible] = React.useState(false);
  const [themePickerVisible, setThemePickerVisible] = React.useState(false);

  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'ar', label: 'العربية' },
    { code: 'zh', label: '中文' },
  ];

  const themeOptions = [
    { value: 'auto', label: tf('settings.themeAuto', 'Auto (system)') },
    { value: 'light', label: tf('settings.themeLight', 'Light') },
    { value: 'dark', label: tf('settings.themeDark', 'Dark') },
  ];

  const supportedCodes = languageOptions.map((o) => o.code);
  const currentLangCode =
    i18n.language && supportedCodes.includes(i18n.language) ? i18n.language : 'en';
  const currentLang =
    languageOptions.find((o) => o.code === currentLangCode)?.label || currentLangCode.toUpperCase();

  const currentThemeLabel =
    themeOptions.find((o) => o.value === mode)?.label || mode.toUpperCase();

  const {
    privateAccount,
    turnOffComments,
    turnOffMessaging,
    muteNotifications,
    pushNotifications,
    inAppNotifications,
    emailNotifications,
    tagNotifications,
    likesReactions,
    commentsReplies,
    newFollowers,
    messageNotifications,
    liveTrendingAlerts,
    doNotDisturb,
    autoplayWifi,
    mediaAutoplayMobile,
    dataSaverMode,
    sensitiveContentVisibility,
    sensitiveContentSuggestion,
    topicInterests,
    contentWarnings,
    textSizeLarge,
    boldText,
    highContrastMode,
    reduceMotion,
    captionsForVideos,
  } = settings;

  const handleLogout = async () => {
    await logout();
    // Navigation will automatically update when isAuthenticated changes in AuthContext
  };

  const handleLogoutAllDevices = async () => {
    try {
      await logoutAllDevices();
      Alert.alert(
        tf('settings.logoutAllDevices', 'Log out of all devices'),
        'All other devices have been logged out. This device is now using new tokens.',
      );
    } catch (error) {
      if (__DEV__) console.error('Logout all devices failed:', error);
      Alert.alert('Error', error.message || 'Failed to log out all devices. Please try again.');
    }
  };

  const handleTextSizeToggle = (value) => {
    updateSettings({ textSizeLarge: value, textSize: value ? 'large' : 'default' });
  };

  const handle2FAToggle = (enable) => {
    if (enable) {
      // Navigate to 2FA setup screen
      navigation.navigate('TwoFactorSetup');
    } else {
      // Prompt for password and 2FA code to disable
      Alert.prompt(
        tf('settings.disable2FA', 'Disable Two-Factor Authentication'),
        tf('settings.enterPasswordToDisable', 'Enter your password and current 2FA code to disable.'),
        [
          { text: tf('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: tf('common.disable', 'Disable'),
            style: 'destructive',
            onPress: (password) => {
              if (!password) {
                Alert.alert('Error', 'Password is required');
                return;
              }
              // Need to also get 2FA code - show another prompt
              Alert.prompt(
                tf('settings.enter2FACode', 'Enter 2FA Code'),
                tf('settings.enterCurrentCode', 'Enter your current authenticator code'),
                [
                  { text: tf('common.cancel', 'Cancel'), style: 'cancel' },
                  {
                    text: tf('common.confirm', 'Confirm'),
                    onPress: async (code) => {
                      if (!code) {
                        Alert.alert('Error', '2FA code is required');
                        return;
                      }
                      try {
                        await api.disable2FA(token, password, code);
                        updateSettings({ twoFactorEnabled: false });
                        Alert.alert(tf('common.success', 'Success'), tf('settings.2faDisabled', 'Two-factor authentication has been disabled.'));
                      } catch (error) {
                        Alert.alert('Error', error.message || 'Failed to disable 2FA');
                      }
                    },
                  },
                ],
                'plain-text',
              );
            },
          },
        ],
        'secure-text',
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            textSizeLarge && styles.headerTitleLarge,
            boldText && styles.headerTitleBold,
            { color: colors.text },
          ]}
        >
          {tf('settings.title', 'Settings')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.general', 'General')}
          </Text>
          <SettingsRow
            icon="language"
            label={`${tf('settings.language', 'Language')} (${currentLang})`}
            onPress={() => setLanguagePickerVisible(true)}
          />
          <SettingsRow
            icon="color-palette-outline"
            label={`${tf('settings.theme', 'Theme')} (${currentThemeLabel})`}
            onPress={() => setThemePickerVisible(true)}
          />
          <SettingsRow
            icon="bookmarks-outline"
            label={tf('nav.bookmarks', 'Bookmarks')}
            onPress={() => navigation.navigate('Bookmarks')}
          />
          <SettingsRow
            icon="ban-outline"
            label={tf('blocked.title', 'Blocked accounts')}
            onPress={() => navigation.navigate('Blocked')}
          />
        </View>

        {/* Help & Support + Legal */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.helpSupport', 'Help & support')}
          </Text>
          <SettingsRow
            icon="information-circle-outline"
            label={tf('settings.aboutUs', 'About Xora Social')}
            onPress={() => navigation.navigate('About')}
          />
          <SettingsRow
            icon="call-outline"
            label={tf('settings.contactUs', 'Contact us')}
            onPress={() => navigation.navigate('Contact')}
          />
          <SettingsRow
            icon="document-text-outline"
            label={tf('settings.termsOfService', 'Terms of service')}
            onPress={() => navigation.navigate('Terms')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={tf('settings.privacyPolicy', 'Privacy policy')}
            onPress={() => navigation.navigate('Privacy')}
          />
        </View>

        {/* Security & login */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.security', 'Security')}
          </Text>
          <SettingsRow
            icon="person-circle-outline"
            label={tf('settings.blockedList', 'Blocked list')}
            onPress={() => navigation.navigate('Blocked')}
          />
          <SettingsRow
            icon="key-outline"
            label={tf('settings.changePassword', 'Change password')}
            onPress={() => navigation.navigate('Security')}
          />
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.twoFactorAuth', 'Two-factor authentication')}
            </Text>
            <Switch
              value={settings.twoFactorEnabled}
              onValueChange={handle2FAToggle}
            />
          </View>
          <SettingsRow
            icon="lock-closed-outline"
            label={tf('settings.logoutAllDevices', 'Log out of all devices')}
            showChevron={false}
            onPress={handleLogoutAllDevices}
          />
          <SettingsRow
            icon="log-out-outline"
            label={tf('settings.logout', 'Log out')}
            showChevron={false}
            onPress={handleLogout}
          />
        </View>

        {/* Privacy */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.privacy', 'Privacy')}
          </Text>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.accountVisibility', 'Account Visibility: Followers Only')}
            </Text>
            <Switch
              value={privateAccount}
              onValueChange={(value) => {
                updateSettings({ privateAccount: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.turnOffComments', 'Turn off comments')}
            </Text>
            <Switch
              value={turnOffComments}
              onValueChange={(value) => {
                updateSettings({ turnOffComments: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.turnOffMessaging', 'Turn off messaging')}
            </Text>
            <Switch
              value={turnOffMessaging}
              onValueChange={(value) => {
                updateSettings({ turnOffMessaging: value });
              }}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.notifications', 'Notifications')}
          </Text>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.muteNotifications', 'Mute all notifications')}
            </Text>
            <Switch
              value={muteNotifications}
              onValueChange={(value) => updateSettings({ muteNotifications: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.pushNotifications', 'Push notifications')}
            </Text>
            <Switch
              value={pushNotifications}
              onValueChange={(value) => {
                updateSettings({ pushNotifications: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.inAppNotifications', 'In-app notifications')}
            </Text>
            <Switch
              value={inAppNotifications}
              onValueChange={(value) => {
                updateSettings({ inAppNotifications: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.emailNotifications', 'Email notifications')}
            </Text>
            <Switch
              value={emailNotifications}
              onValueChange={(value) => {
                updateSettings({ emailNotifications: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.tags', 'Tags & mentions')}
            </Text>
            <Switch
              value={tagNotifications}
              onValueChange={(value) => updateSettings({ tagNotifications: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.likesReactions', 'Likes & reactions')}
            </Text>
            <Switch
              value={likesReactions}
              onValueChange={(value) => updateSettings({ likesReactions: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.commentsReplies', 'Comments & replies')}
            </Text>
            <Switch
              value={commentsReplies}
              onValueChange={(value) => updateSettings({ commentsReplies: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.newFollowers', 'New followers')}
            </Text>
            <Switch
              value={newFollowers}
              onValueChange={(value) => updateSettings({ newFollowers: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.messages', 'Messages')}
            </Text>
            <Switch
              value={messageNotifications}
              onValueChange={(value) => updateSettings({ messageNotifications: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.liveTrendingAlerts', 'Live & trending alerts')}
            </Text>
            <Switch
              value={liveTrendingAlerts}
              onValueChange={(value) => updateSettings({ liveTrendingAlerts: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.doNotDisturb', 'Do not disturb')}
            </Text>
            <Switch
              value={doNotDisturb}
              onValueChange={(value) => updateSettings({ doNotDisturb: value })}
            />
          </View>
        </View>

        {/* Content preferences */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.contentPreferences', 'Content preferences')}
          </Text>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.sensitiveContent', 'Show sensitive content')}
            </Text>
            <Switch
              value={sensitiveContentVisibility}
              onValueChange={(value) => {
                updateSettings({ sensitiveContentVisibility: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.sensitiveContentSuggestion', 'Suggest sensitive content')}
            </Text>
            <Switch
              value={sensitiveContentSuggestion}
              onValueChange={(value) => {
                updateSettings({ sensitiveContentSuggestion: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.topicInterests', 'Topic interests')}
            </Text>
            <Switch
              value={topicInterests}
              onValueChange={(value) => updateSettings({ topicInterests: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.mediaAutoplayWifi', 'Autoplay on Wi-Fi')}
            </Text>
            <Switch
              value={autoplayWifi}
              onValueChange={(value) => updateSettings({ autoplayWifi: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.mediaAutoplayMobile', 'Autoplay on mobile data')}
            </Text>
            <Switch
              value={mediaAutoplayMobile}
              onValueChange={(value) => updateSettings({ mediaAutoplayMobile: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.dataSaverMode', 'Data saver mode')}
            </Text>
            <Switch
              value={dataSaverMode}
              onValueChange={(value) => updateSettings({ dataSaverMode: value })}
            />
          </View>
        </View>

        {/* Accessibility */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.accessibility', 'Accessibility')}
          </Text>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.textSize', 'Large text')}
            </Text>
            <Switch
              value={textSizeLarge}
              onValueChange={handleTextSizeToggle}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.boldText', 'Bold text')}
            </Text>
            <Switch
              value={boldText}
              onValueChange={(value) => updateSettings({ boldText: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.highContrastMode', 'High contrast mode')}
            </Text>
            <Switch
              value={highContrastMode}
              onValueChange={(value) => {
                updateSettings({ highContrastMode: value });
              }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.reduceMotion', 'Reduce motion')}
            </Text>
            <Switch
              value={reduceMotion}
              onValueChange={(value) => updateSettings({ reduceMotion: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.captionsForVideos', 'Captions for videos')}
            </Text>
            <Switch
              value={captionsForVideos}
              onValueChange={(value) => updateSettings({ captionsForVideos: value })}
            />
          </View>
        </View>

        {/* Data & storage */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.dataStorage', 'Data & storage')}
          </Text>
          <SettingsRow
            icon="download-outline"
            label={tf('settings.downloadUserData', 'Download your data')}
            onPress={async () => {
              if (!token) {
                if (__DEV__) console.warn('Please log in to download your data.');
                return;
              }
              try {
                if (__DEV__) console.info('Preparing your data for download...');
                const _response = await api.exportUserData(token);
                if (__DEV__) console.info('Your data download will begin shortly. Check your email for the download link.');
              } catch (error) {
                if (__DEV__) console.error('Export failed:', error);
                if (__DEV__) console.error('Failed to export data. Please try again later.');
              }
            }}
          />
        </View>

        {/* Safety & moderation */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.safetyModeration', 'Safety & moderation')}
          </Text>
          <SettingsRow
            icon="flag-outline"
            label={tf('settings.reportProblem', 'Report a problem')}
            onPress={() => navigation.navigate('Report', { entityType: 'user', entityId: 'self', summary: tf('settings.reportProblem', 'Report a problem') })}
          />
          <SettingsRow
            icon="alert-circle-outline"
            label={tf('settings.reportUser', 'Report a user')}
            onPress={() => navigation.navigate('Report', { entityType: 'user', entityId: 'unknown', summary: tf('settings.reportUser', 'Report a user') })}
          />
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.rowLabel,
                textSizeLarge && styles.rowLabelLarge,
                boldText && styles.rowLabelBold,
                { color: colors.text },
              ]}
            >
              {tf('settings.contentWarnings', 'Show content warnings')}
            </Text>
            <Switch
              value={contentWarnings}
              onValueChange={(value) => {
                updateSettings({ contentWarnings: value });
              }}
            />
          </View>
        </View>

        {/* Account management */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              textSizeLarge && styles.sectionTitleLarge,
              boldText && styles.sectionTitleBold,
              { color: colors.textSecondary },
            ]}
          >
            {tf('settings.accountManagement', 'Account management')}
          </Text>
          <SettingsRow
            icon="trash-outline"
            label={tf('settings.deleteAccount', 'Delete account')}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to permanently delete your account? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      if (!token) {
                        if (__DEV__) console.warn('Please log in to delete your account.');
                        return;
                      }
                      // For mobile, we can't use prompt, so skip password confirmation for now
                      // const password = prompt('Enter your password to confirm account deletion:');
                      // if (!password) return;

                      try {
                        await api.deleteAccount(token, ''); // Assuming API handles it
                        if (__DEV__) console.info('Your account has been deleted. You will be logged out.');
                        await logout();
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      } catch (error) {
                        if (__DEV__) console.error('Account deletion failed:', error);
                        if (__DEV__) console.error(error.message || 'Failed to delete account. Please verify your password.');
                      }
                    },
                  },
                ],
              );
            }}
          />
        </View>

        {/* Language dropdown */}
        <Modal
          transparent
          animationType={reduceMotion ? 'none' : 'fade'}
          visible={languagePickerVisible}
          onRequestClose={() => setLanguagePickerVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => setLanguagePickerVisible(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {tf('settings.language', 'Language')}
              </Text>
              {languageOptions.map((opt) => {
                const selected = opt.code === currentLangCode;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[
                      styles.modalOption,
                      selected && { backgroundColor: `${colors.primary}33` },
                    ]}
                    onPress={async () => {
                      await i18n.changeLanguage(opt.code);
                      setLanguagePickerVisible(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Theme dropdown */}
        <Modal
          transparent
          animationType={reduceMotion ? 'none' : 'fade'}
          visible={themePickerVisible}
          onRequestClose={() => setThemePickerVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => setThemePickerVisible(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {tf('settings.theme', 'Theme')}
              </Text>
              {themeOptions.map((opt) => {
                const selected = opt.value === mode;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.modalOption,
                      selected && { backgroundColor: `${colors.primary}33` },
                    ]}
                    onPress={() => {
                      updateMode(opt.value);
                      setThemePickerVisible(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.text }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitleLarge: {
    fontSize: 22,
  },
  headerTitleBold: {
    fontWeight: '800',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionTitleLarge: {
    fontSize: 16,
  },
  sectionTitleBold: {
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowLabelLarge: {
    fontSize: 18,
  },
  rowLabelBold: {
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  modalOptionText: {
    fontSize: 15,
  },
});
