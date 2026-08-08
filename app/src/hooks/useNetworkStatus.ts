/**
 * useNetworkStatus — network connectivity hook via @react-native-community/netinfo.
 *
 * Returns a boolean `isOnline` that updates on connectivity change.
 * Also returns the full NetInfoState for advanced use cases.
 */

import { useState, useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export function useNetworkStatus(): {
  isOnline: boolean;
  isConnected: boolean | null;
  state: NetInfoState | null;
} {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      setState(netState);
    });

    // Fetch initial state immediately
    NetInfo.fetch().then(setState).catch(() => {
      // If fetch fails, assume offline
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isConnected =
    state?.isConnected === true && state?.isInternetReachable !== false;
  const isOnline = isConnected === true;

  return { isOnline, isConnected, state };
}
