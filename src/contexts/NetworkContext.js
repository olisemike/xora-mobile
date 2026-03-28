import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [globalError, setGlobalError] = useState(null);

  // Real network detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, []);

  const registerError = useCallback((message) => {
    if (!message) return;
    setGlobalError(message);
  }, []);

  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        // Exposed for debug/testing only
        setIsOnlineForDebug: setIsOnline,
        globalError,
        registerError,
        clearError,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return ctx;
};
