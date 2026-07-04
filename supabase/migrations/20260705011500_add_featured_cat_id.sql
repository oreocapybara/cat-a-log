-- Add featured_cat_id to profiles for the shareable profiles feature
ALTER TABLE profiles
  ADD COLUMN featured_cat_id uuid REFERENCES cats(id) ON DELETE SET NULL;

-- Allow users to read any profile (public profiles)
-- The existing SELECT policy on profiles already allows authenticated users to read all rows.
-- Add a policy for anonymous (unauthenticated) access:
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO anon
  USING (true);
