/**
 * ErrorView — reusable, network-aware error display.
 *
 * Renders a centered error state with a MaterialCommunityIcons icon inside a
 * circular surface, a user-friendly message, and contextual action buttons
 * (Retry for retryable errors, Sign In for auth errors). Uses the warm
 * Atelier theme (gold accent, cream/charcoal surfaces).
 *
 * Usage:
 *   const [error, setError] = useState<AppError | null>(null);
 *   // in catch: setError(classifyError(e));
 *   // in render:
 *   {error && <ErrorView error={error} onRetry={loadData} onSignIn={() => router.replace('/(auth)/welcome')} />}
 */

import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors, typography, spacing, radius } from '@/theme';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { AppError, AppErrorType } from '@/lib/errors';

type ErrorViewProps = {
  error: AppError;
  /** Called when the user taps Retry. Shown only when error.retryable is true. */
  onRetry?: () => void;
  /** Called when the user taps Sign In. Shown only for auth errors. */
  onSignIn?: () => void;
};

const ICON_MAP: Record<AppErrorType, {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
}> = {
  network: { name: 'wifi-off', label: 'No Connection' },
  auth: { name: 'lock-outline', label: 'Session Expired' },
  not_found: { name: 'magnify', label: 'Not Found' },
  server: { name: 'server-network-off', label: 'Server Unavailable' },
  unknown: { name: 'alert-circle-outline', label: 'Something Went Wrong' },
};

export function ErrorView({ error, onRetry, onSignIn }: ErrorViewProps) {
  const colors = useThemeColors();
  const icon = ICON_MAP[error.type];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Icon in a circular surface */}
      <View
        style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}
      >
        <MaterialCommunityIcons
          name={icon.name}
          size={36}
          color={colors.accent}
        />
      </View>

      {/* Label + message */}
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {icon.label}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {error.message}
      </Text>

      {/* Action buttons */}
      {error.retryable && onRetry && (
        <View style={styles.buttonRow}>
          <PrimaryButton label="Retry" onPress={onRetry} />
        </View>
      )}
      {error.type === 'auth' && onSignIn && (
        <View style={styles.buttonRow}>
          <PrimaryButton label="Sign In" onPress={onSignIn} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.title3,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  buttonRow: {
    marginTop: spacing.xl,
    minWidth: 200,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});
