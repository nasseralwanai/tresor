/**
 * useCircleId — hook to get the current user's circle ID.
 * Returns the first circle the user is a member of.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useCircleId() {
  const { user } = useAuth();
  const [circleId, setCircleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCircleId() {
      if (!user?.id) {
        setCircleId(null);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('circle_members')
          .select('circle_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setCircleId(data?.circle_id ?? null);
      } catch (e) {
        console.warn('[useCircleId] Failed to fetch circle:', e);
        setCircleId(null);
      } finally {
        setLoading(false);
      }
    }
    fetchCircleId();
  }, [user?.id]);

  return { circleId, loading };
}
