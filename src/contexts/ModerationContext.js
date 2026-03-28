import React, { createContext, useContext, useState, useCallback } from 'react';

import api from '../services/api';

import { useAuth } from './AuthContext';

const ModerationContext = createContext(null);

export const ModerationProvider = ({ children }) => {
  const [reports, setReports] = useState([]);
  const { token } = useAuth();

  const submitReport = useCallback(async (payload) => {
    const { targetType, targetId, category, description } = payload;

    // Validate required fields
    if (!targetType || !targetId || !category) {
      throw new Error('Missing required report fields: targetType, targetId, and category are required');
    }

    try {
      // Submit to backend API
      const result = await api.reportPost(token, targetType, targetId, category, description || '');

      // Also store locally for UI display
      const report = {
        id: result?.id || `report-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...payload,
      };
      setReports((prev) => [report, ...prev]);

      if (__DEV__) {
        console.info('Report submitted to backend:', report);
      }

      return report.id;
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to submit report:', error);
      }
      throw error;
    }
  }, [token]);

  return (
    <ModerationContext.Provider value={{ reports, submitReport }}>
      {children}
    </ModerationContext.Provider>
  );
};

export const useModeration = () => {
  const ctx = useContext(ModerationContext);
  if (!ctx) {
    throw new Error('useModeration must be used within a ModerationProvider');
  }
  return ctx;
};
