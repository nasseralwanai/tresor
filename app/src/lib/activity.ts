/**
 * Activity Feed API — fetch activity entries.
 *
 * TODO(backend): Replace mock with real Supabase queries:
 *   supabase.from('activity_feed').select('*').order('created_at', { ascending: false })
 */

import type { ActivityEntry } from '@/types/items';
import { mockActivity } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch all activity for the user's circle, newest first. */
export async function getActivityFeed(): Promise<ActivityEntry[]> {
  await delay(400);
  return [...mockActivity].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
