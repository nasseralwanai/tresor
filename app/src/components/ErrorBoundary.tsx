/**
 * ErrorBoundary — catches runtime errors and shows a graceful error screen.
 *
 * Dark theme with gold "Try Again" button. Wraps the entire app in _layout.tsx.
 * Uses React class component (getDerivedStateFromError) as required by React.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DarkThemeColors, serifFont, bodyFont, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import { IronworkMark } from '@/components/IronworkMark';

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

const colors = DarkThemeColors;

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Runtime error caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <IronworkMark size={56} variant="gold-on-dark" />
          </View>

          <Text style={styles.title}>Something went wrong</Text>

          <Text style={styles.message}>
            An unexpected error occurred. Your data is safe — try again to
            continue.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetailsWrap}>
              <Text style={styles.errorLabel}>Error details (dev only):</Text>
              <Text style={styles.errorDetails}>
                {this.state.error.message}
              </Text>
              {Platform.OS !== 'web' && (
                <Text style={styles.errorStack}>
                  {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
                </Text>
              )}
            </View>
          )}

          <View style={styles.buttonWrap}>
            <PrimaryButton label="Try Again" onPress={this.handleReset} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  logoWrap: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: serifFont,
    fontSize: 26,
    fontWeight: '400',
    color: colors.cream,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: bodyFont,
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  errorDetailsWrap: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.darkSurface,
    borderRadius: radius.md,
    width: '100%',
    maxWidth: 320,
  },
  errorLabel: {
    fontFamily: bodyFont,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorDetails: {
    fontFamily: bodyFont,
    fontSize: 12,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  errorStack: {
    fontFamily: bodyFont,
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  buttonWrap: {
    marginTop: spacing.xl,
    minWidth: 200,
  },
});
