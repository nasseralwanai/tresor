-- Add is_private column to wishlist_items for per-item privacy
ALTER TABLE public.wishlist_items 
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Update the circle visibility policy to filter by item-level is_private
-- (the existing policy checks the parent wishlist's is_private)
DROP POLICY IF EXISTS "wishlist_items_circle_members_select_nonprivate" ON public.wishlist_items;
CREATE POLICY "wishlist_items_circle_members_select_nonprivate"
  ON public.wishlist_items FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      is_private = false
      AND EXISTS (
        SELECT 1 FROM public.wishlists w
        WHERE w.id = wishlist_items.wishlist_id
        AND w.is_private = false
      )
    )
  );
