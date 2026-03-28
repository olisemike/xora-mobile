import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext(null);

const DARK_COLORS = {
  // Match the web app's default dark theme palette (see web global.css)
  background: '#0A1220',
  surface: '#142033',
  primary: '#C47F2A',
  onPrimary: '#000000',
  text: '#E6EDF6',
  textSecondary: '#9AA8B6',
  textTertiary: '#9AA8B6',
  border: '#1A1F2B',
};

const LIGHT_COLORS = {
  background: '#ffffff',
  surface: '#f5f5f5',
  primary: '#E91E63',
  onPrimary: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#e0e0e0',
};

const HIGH_CONTRAST_LIGHT = {
  background: '#ffffff',
  surface: '#ffffff',
  primary: '#C9004A',
  onPrimary: '#ffffff',
  text: '#000000',
  textSecondary: '#000000',
  textTertiary: '#333333',
  border: '#000000',
};

const HIGH_CONTRAST_DARK = {
  background: '#000000',
  surface: '#000000',
  primary: '#FF1970',
  onPrimary: '#000000',
  text: '#ffffff',
  textSecondary: '#ffffff',
  textTertiary: '#cccccc',
  border: '#ffffff',
};

const THEME_KEY = 'xora_theme_mode'; // 'light' | 'dark' | 'auto'

export const ThemeProvider = ({ children, highContrastMode = false }) => {
  const [mode, setMode] = useState('auto');
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || 'light');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
          setMode(saved);
        }
      } catch (e) {
        if (__DEV__) {
          if (__DEV__) console.info('Failed to load theme mode', e);
        }
      }
    })();
  }, []);

  const updateMode = async (next) => {
    setMode(next);
    try {
      // Save immediately to AsyncStorage
      await AsyncStorage.setItem(THEME_KEY, next);
      if (__DEV__) console.log('[Theme] Saved theme mode:', next);
    } catch (e) {
      if (__DEV__) {
        if (__DEV__) console.info('Failed to save theme mode', e);
      }
    }
  };

  const colorScheme = mode === 'auto' ? systemScheme : mode;

  // Apply high contrast mode if enabled
  let colors;
  if (highContrastMode) {
    colors = colorScheme === 'dark' ? HIGH_CONTRAST_DARK : HIGH_CONTRAST_LIGHT;
  } else {
    colors = colorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  }

  return (
    <ThemeContext.Provider value={{ mode, colors, updateMode, highContrastMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
