import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemeContext } from '../contexts/ThemeContext';

// Fallback colors when ThemeContext is not available (ErrorBoundary is outside ThemeProvider)
const FALLBACK_COLORS = {
  background: '#0A1220',
  surface: '#142033',
  primary: '#C47F2A',
  onPrimary: '#000000',
  text: '#E6EDF6',
  textSecondary: '#9AA8B6',
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) {
      console.error('Error Boundary caught:', error, errorInfo);
    }
    // In production, send to error logging service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ThemeContext.Consumer>
          {(themeContext) => {
            // Use fallback colors if theme context is null (ErrorBoundary is outside ThemeProvider)
            const colors = themeContext?.colors || FALLBACK_COLORS;
            return (
              <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Ionicons color={colors.primary} name="warning-outline" size={64} />
                <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                We’re sorry for the inconvenience. Please try again.
                </Text>
                {__DEV__ && this.state.error ? <Text style={[styles.errorText, { color: colors.textSecondary }]}>{this.state.error.toString()}</Text> : null}
                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={this.handleReset}>
                  <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        </ThemeContext.Consumer>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
