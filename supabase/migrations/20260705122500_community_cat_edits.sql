-- ============================================================
-- COMMUNITY CAT EDITS
-- Adds an audit column (updated_by) and opens UPDATE policy so any
-- authenticated user can update a cat's notes — not just the original
-- tagger. This supports the crowdsourced spirit: cats are community data.
-- ============================================================

-- Audit breadcrumb: who last edited this cat's info
ALTER TABLE cats ADD COLUMN updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- The existing "Tagger can update their own cat records" policy covers
-- the original tagger. This new permissive policy (Postgres ORs all
-- permissive policies) lets any authenticated user update too.
CREATE POLICY "Authenticated users can update cat info"
  ON cats FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
