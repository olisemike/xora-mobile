import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'xora_profile_v1';

const ProfileContext = createContext(null);

const defaultProfile = {
  name: 'John Doe',
  username: 'johndoe',
  bio: 'Living life one day at a time 🌟',
  location: '',
  avatar: null,
  coverImage: null,
};

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(defaultProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setProfile({ ...defaultProfile, ...parsed });
          } catch (parseError) {
            if (__DEV__) console.error('Failed to parse profile data:', parseError);
            // Clear corrupted data
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        if (__DEV__) console.error('Failed to load profile:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch((e) => {
      if (__DEV__) {
        console.error('Failed to save profile:', e);
      }
    });
  }, [profile, loaded]);

  const updateProfile = (partial) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, loaded }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
};
