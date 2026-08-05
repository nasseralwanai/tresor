/**
 * Circle API — fetch circle members and info.
 *
 * TODO(backend): Replace mock with real Supabase queries:
 *   supabase.from('circle_members').select('*, profiles(*)')
 */

import { mockMembers, mockCircle } from './mockData';
import type { MockMember } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch all members of the current user's circle. */
export async function getCircleMembers(): Promise<MockMember[]> {
  await delay(400);
  return mockMembers;
}

/** Fetch the current user's circle info. */
export async function getMyCircle(): Promise<{ id: string; name: string } | null> {
  await delay(300);
  return mockCircle;
}
