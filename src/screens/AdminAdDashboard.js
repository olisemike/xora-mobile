import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { API_URL } from '../services/api';

const AdminAdDashboard = ({ navigation }) => {
  const { user, token } = useAuth();
  const { colors } = useTheme();

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [analytics, setAnalytics] = useState(null);

  const positions = [
    { value: 'all', label: 'All Placements' },
    { value: 'feeds', label: 'Feeds' },
    { value: 'reels', label: 'Reels' },
    { value: 'stories', label: 'Stories' },
    { value: 'search', label: 'Search' },
  ];

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedPosition !== 'all' ? `?placement=${selectedPosition}` : '';
      const response = await fetch(`${API_URL}/admin/ads${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setAds(data.data.ads);
      } else {
        Alert.alert('Error', data.error || 'Failed to load ads');
      }
    } catch (_error) {
      Alert.alert('Error', 'Network error loading ads');
    } finally {
      setLoading(false);
    }
  }, [selectedPosition, token]);

  const loadAnalytics = useCallback(async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const response = await fetch(
        `${API_URL}/admin/ads/analytics?start_date=${startDate.toISOString().split('T')[0]}`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      );

      const data = await response.json();
      if (response.ok) {
        setAnalytics(data.data);
      }
    } catch (_error) {
      // Error loading analytics silently
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAds();
      loadAnalytics();
    }
  }, [user?.role, selectedPosition, loadAds, loadAnalytics]);

  const toggleAdStatus = async (adId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const response = await fetch(`${API_URL}/admin/ads/${adId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        loadAds(); // Refresh list
        Alert.alert('Success', `Ad ${newStatus === 'active' ? 'activated' : 'paused'}`);
      } else {
        Alert.alert('Error', 'Failed to update ad status');
      }
    } catch (_error) {
      Alert.alert('Error', 'Network error updating ad');
    }
  };

  const deleteAd = async (adId) => {
    Alert.alert(
      'Delete Ad',
      'Are you sure you want to delete this ad?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/admin/ads/${adId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (response.ok) {
                loadAds();
                Alert.alert('Success', 'Ad deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete ad');
              }
            } catch (_error) {
              Alert.alert('Error', 'Network error deleting ad');
            }
          },
        },
      ],
    );
  };

  const moderateAd = async (adId, action) => {
    const actionLabels = {
      approve: 'Approve',
      reject: 'Reject',
      flag: 'Flag',
    };

    Alert.alert(
      `${actionLabels[action]} Ad`,
      `Are you sure you want to ${action} this ad?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabels[action],
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/admin/ads/${adId}/moderate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action }),
              });

              if (response.ok) {
                loadAds();
                Alert.alert('Success', `Ad ${action}ed successfully`);
              } else {
                Alert.alert('Error', `Failed to ${action} ad`);
              }
            } catch (_error) {
              Alert.alert('Error', `Network error ${action}ing ad`);
            }
          },
        },
      ],
    );
  };

  const getPlacementLabel = (ad) => {
    const placements = [];
    if (ad.placementFeeds) placements.push('FEEDS');
    if (ad.placementReels) placements.push('REELS');
    if (ad.placementStories) placements.push('STORIES');
    if (ad.placementSearch) placements.push('SEARCH');
    return placements.length ? placements.join(', ') : 'UNKNOWN';
  };

  const renderAdCard = (ad) => {
    const totalImpressions = ad.totalImpressions || 0;
    const totalClicks = ad.totalClicks || 0;
    const ctr = totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : '0.00';

    return (
      <View key={ad.id} style={[styles.adCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Ad Header */}
        <View style={styles.adHeader}>
          <View style={styles.adInfo}>
            <Text numberOfLines={1} style={[styles.adTitle, { color: colors.text }]}>
              {ad.title}
            </Text>
            <View style={styles.adMeta}>
              <Text style={[styles.adPosition, { color: colors.primary }]}>
                {getPlacementLabel(ad)}
              </Text>
              <Text style={[styles.adStatus, {
                color: ad.status === 'active' ? '#28a745' : '#6c757d',
              }]}>
                {ad.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.adActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleAdStatus(ad.id, ad.status)}
            >
              <Ionicons
                color={colors.primary}
                name={ad.status === 'active' ? 'pause' : 'play'}
                size={20}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => moderateAd(ad.id, 'flag')}
            >
              <Ionicons color="#ffc107" name="flag" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteAd(ad.id)}
            >
              <Ionicons color="#dc3545" name="trash" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ad Content */}
        {ad.contentUrl || ad.thumbnailUrl ? (
          <Image source={{ uri: ad.contentUrl || ad.thumbnailUrl }} style={styles.adImage} />
        ) : null}

        {ad.description ? (
          <Text numberOfLines={2} style={[styles.adDescription, { color: colors.textSecondary }]}>
            {ad.description}
          </Text>
        ) : null}

        {/* Ad Stats */}
        <View style={styles.adStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {totalImpressions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Impressions
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {totalClicks}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Clicks
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {ctr}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            CTR
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {ad.dailyImpressionsLimit || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Today
            </Text>
          </View>
        </View>

        {/* CTA Button Preview */}
        <TouchableOpacity style={[styles.ctaPreview, { borderColor: colors.primary }]}>
          <Text style={[styles.ctaText, { color: colors.primary }]}>
            {ad.ctaText || 'Learn More'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Admin access required
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Ad Dashboard
        </Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Ionicons color={colors.primary} name="add" size={24} />
        </TouchableOpacity>
      </View>

      {/* Analytics Summary */}
      {analytics ? (
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>
            Last 7 Days Performance
          </Text>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <Text style={[styles.analyticsNumber, { color: colors.primary }]}>
                {analytics.daily_impressions?.reduce((sum, day) => sum + day.impressions, 0) || 0}
              </Text>
              <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>
                Total Impressions
              </Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={[styles.analyticsNumber, { color: colors.primary }]}>
                {analytics.daily_clicks?.reduce((sum, day) => sum + day.clicks, 0) || 0}
              </Text>
              <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>
                Total Clicks
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Position Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {positions.map((position) => (
          <TouchableOpacity
            key={position.value}
            style={[
              styles.filterButton,
              { borderColor: colors.border },
              selectedPosition === position.value && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedPosition(position.value)}
          >
            <Text style={[
              styles.filterText,
              { color: colors.text },
              selectedPosition === position.value && { color: '#fff' },
            ]}>
              {position.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ads List */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.adsList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading ads...
            </Text>
          </View>
        ) : ads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons color={colors.textSecondary} name="megaphone-outline" size={60} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No ads found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Create your first ad to get started
            </Text>
          </View>
        ) : (
          ads.map(renderAdCard)
        )}
      </ScrollView>

      {/* Create Ad Modal */}
      <CreateAdModal
        colors={colors}
        token={token}
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadAds();
        }}
      />
    </KeyboardAvoidingView>
  );
};

// Separate component for Create Ad Modal
const CreateAdModal = ({ visible, onClose, onSuccess, token, colors }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentUrl: '',
    ctaUrl: '',
    ctaText: 'Learn More',
    adType: 'image',
    placement: 'feeds',
    dailyBudgetLimit: '1000',
    dailyImpressionsLimit: '10000',
  });

  const [loading, setLoading] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);

  const positions = ['feeds', 'stories', 'reels', 'search'];
  const adTypes = ['image', 'video'];

  const handleSubmit = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    if ((formData.adType === 'image' || formData.adType === 'video') && !formData.contentUrl) {
      Alert.alert('Error', 'Content URL is required for image/video ads');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/ads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          adType: formData.adType,
          contentUrl: formData.contentUrl || null,
          ctaUrl: formData.ctaUrl || null,
          ctaText: formData.ctaText || null,
          placementFeeds: formData.placement === 'feeds',
          placementReels: formData.placement === 'reels',
          placementStories: formData.placement === 'stories',
          placementSearch: formData.placement === 'search',
          globalTargeting: !showTargeting,
          targetRegions: [],
          targetLanguages: [],
          targetInterests: [],
          dailyBudgetLimit: formData.dailyBudgetLimit ? parseInt(formData.dailyBudgetLimit, 10) : null,
          dailyImpressionsLimit: formData.dailyImpressionsLimit ? parseInt(formData.dailyImpressionsLimit, 10) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Ad created successfully');
        onSuccess();
      } else {
        Alert.alert('Error', data.error || 'Failed to create ad');
      }
    } catch (_error) {
      Alert.alert('Error', 'Network error creating ad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="formSheet" visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Create Ad</Text>
          <TouchableOpacity disabled={loading} onPress={handleSubmit}>
            <Text style={[styles.modalSave, {
              color: loading ? colors.textSecondary : colors.primary,
            }]}>
              {loading ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              placeholder="Ad title"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              multiline
              numberOfLines={3}
              placeholder="Ad description"
              placeholderTextColor={colors.textSecondary}
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Content URL</Text>
            <TextInput
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.contentUrl}
              onChangeText={(text) => setFormData({ ...formData, contentUrl: text })}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>CTA URL</Text>
            <TextInput
              placeholder="https://example.com"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.ctaUrl}
              onChangeText={(text) => setFormData({ ...formData, ctaUrl: text })}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>CTA Text</Text>
            <TextInput
              placeholder="Learn More"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.ctaText}
              onChangeText={(text) => setFormData({ ...formData, ctaText: text })}
            />
          </View>

          {/* Ad Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ad Type</Text>
            <View style={styles.positionGrid}>
              {adTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.positionButton,
                    { borderColor: colors.border },
                    formData.adType === type && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, adType: type })}
                >
                  <Text style={[
                    styles.positionText,
                    { color: colors.text },
                    formData.adType === type && { color: '#fff' },
                  ]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Position Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Position</Text>
            <View style={styles.positionGrid}>
              {positions.map((position) => (
                <TouchableOpacity
                  key={position}
                  style={[
                    styles.positionButton,
                    { borderColor: colors.border },
                    formData.placement === position && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, placement: position })}
                >
                  <Text style={[
                    styles.positionText,
                    { color: colors.text },
                    formData.placement === position && { color: '#fff' },
                  ]}>
                    {position.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Budget & Limits */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget & Limits</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Daily Budget (cents)</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="1000"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.dailyBudgetLimit}
              onChangeText={(text) => setFormData({ ...formData, dailyBudgetLimit: text })}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Max Daily Impressions</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="10000"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.dailyImpressionsLimit}
              onChangeText={(text) => setFormData({ ...formData, dailyImpressionsLimit: text })}
            />
          </View>

          {/* Targeting Toggle */}
          <View style={styles.section}>
            <View style={styles.targetingHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Targeting</Text>
              <Switch
                thumbColor={showTargeting ? '#fff' : colors.textSecondary}
                trackColor={{ false: colors.border, true: colors.primary }}
                value={showTargeting}
                onValueChange={setShowTargeting}
              />
            </View>

            {showTargeting ? (
              <Text style={[styles.targetingNote, { color: colors.textSecondary }]}>
                Advanced targeting options coming soon...
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  analyticsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  analyticsLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  adsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  adCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  adMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adPosition: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  adStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  adActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  adImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  adDescription: {
    padding: 16,
    paddingTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  adStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  ctaPreview: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  targetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetingNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default AdminAdDashboard;
