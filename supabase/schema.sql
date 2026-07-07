-- ============================================================
-- Cat-A-Log Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with app-level profile data
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username    text UNIQUE NOT NULL CHECK (char_length(username) >= 2 AND char_length(username) <= 30),
  avatar_url  text,
  bio         text CHECK (char_length(bio) <= 160),
  tags_count  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Profile is created manually after username is chosen on /setup-profile
  -- This function is a no-op placeholder kept for future use
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CATS
-- One record per unique real-world stray cat
-- ============================================================
CREATE TABLE IF NOT EXISTS cats (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text CHECK (char_length(name) <= 50),
  primary_photo_url text NOT NULL,
  lat               double precision NOT NULL,
  lng               double precision NOT NULL,
  is_ear_tipped     boolean NOT NULL DEFAULT false,
  notes             text CHECK (char_length(notes) <= 500),
  tagged_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  confidence_score  int NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Spatial index for fast nearby queries
CREATE INDEX IF NOT EXISTS cats_location_idx ON cats (lat, lng);

-- ============================================================
-- SIGHTINGS
-- Each time a cat is spotted and photographed
-- ============================================================
CREATE TABLE IF NOT EXISTS sightings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id     uuid NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  photo_url  text NOT NULL,
  lat        double precision NOT NULL,
  lng        double precision NOT NULL,
  spotted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sightings_cat_id_idx ON sightings (cat_id);
CREATE INDEX IF NOT EXISTS sightings_location_idx ON sightings (lat, lng);

-- ============================================================
-- MATCH VOTES
-- Proposals that two cat records are the same animal
-- Requires 3 confirms to merge, 3 denies to reject
-- ============================================================
CREATE TABLE IF NOT EXISTS match_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_a_id      uuid NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  cat_b_id      uuid NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  proposed_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  votes_confirm int NOT NULL DEFAULT 0,
  votes_deny    int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Prevent duplicate proposals for the same pair
  CONSTRAINT unique_cat_pair CHECK (cat_a_id < cat_b_id),
  UNIQUE (cat_a_id, cat_b_id)
);

-- ============================================================
-- MATCH VOTE ENTRIES
-- Individual votes from community members on a match proposal
-- ============================================================
CREATE TABLE IF NOT EXISTS match_vote_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_vote_id  uuid NOT NULL REFERENCES match_votes(id) ON DELETE CASCADE,
  voted_by       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote           text NOT NULL CHECK (vote IN ('confirm', 'deny')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- One vote per user per proposal
  UNIQUE (match_vote_id, voted_by)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_vote_entries ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- CATS
CREATE POLICY "Cats are publicly readable"
  ON cats FOR SELECT USING (true);

CREATE POLICY "Authenticated users can tag cats"
  ON cats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tagger can update their own cat records"
  ON cats FOR UPDATE USING (auth.uid() = tagged_by);

-- SIGHTINGS
CREATE POLICY "Sightings are publicly readable"
  ON sightings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can log sightings"
  ON sightings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- MATCH VOTES
CREATE POLICY "Match votes are publicly readable"
  ON match_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can propose matches"
  ON match_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- No UPDATE policy: vote counts are maintained by trigger, not client updates

-- MATCH VOTE ENTRIES
CREATE POLICY "Vote entries are publicly readable"
  ON match_vote_entries FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote"
  ON match_vote_entries FOR INSERT WITH CHECK (auth.uid() = voted_by);

-- ============================================================
-- MATCH VOTE AGGREGATION TRIGGER
-- Automatically updates vote counts when entries are added
-- ============================================================
CREATE OR REPLACE FUNCTION update_match_vote_counts()
RETURNS trigger AS $$
BEGIN
  UPDATE match_votes
  SET
    votes_confirm = (
      SELECT COUNT(*) FROM match_vote_entries
      WHERE match_vote_id = NEW.match_vote_id AND vote = 'confirm'
    ),
    votes_deny = (
      SELECT COUNT(*) FROM match_vote_entries
      WHERE match_vote_id = NEW.match_vote_id AND vote = 'deny'
    ),
    status = CASE
      WHEN (SELECT COUNT(*) FROM match_vote_entries WHERE match_vote_id = NEW.match_vote_id AND vote = 'confirm') >= 3 THEN 'merged'
      WHEN (SELECT COUNT(*) FROM match_vote_entries WHERE match_vote_id = NEW.match_vote_id AND vote = 'deny') >= 3 THEN 'rejected'
      ELSE 'pending'
    END
  WHERE id = NEW.match_vote_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER match_vote_entries_after_insert_update_counts
  AFTER INSERT ON match_vote_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_match_vote_counts();

-- Restrict direct calls — only triggers should fire this
REVOKE EXECUTE ON FUNCTION update_match_vote_counts() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- HELPER FUNCTION: Nearby Cats
-- Returns cats within a bounding box (~radius km)
-- Usage: SELECT * FROM nearby_cats(14.5995, 120.9842, 0.5)
-- ============================================================
CREATE OR REPLACE FUNCTION nearby_cats(
  user_lat  double precision,
  user_lng  double precision,
  radius_km double precision DEFAULT 1.0
)
RETURNS TABLE (
  id                uuid,
  name              text,
  primary_photo_url text,
  lat               double precision,
  lng               double precision,
  is_ear_tipped     boolean,
  notes             text,
  tagged_by         uuid,
  confidence_score  int,
  created_at        timestamptz,
  distance_km       double precision
) AS $$
DECLARE
  lat_delta double precision := radius_km / 111.0;
  lng_delta double precision := radius_km / (111.0 * cos(radians(user_lat)));
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.name, c.primary_photo_url,
    c.lat, c.lng, c.is_ear_tipped, c.notes,
    c.tagged_by, c.confidence_score, c.created_at,
    -- Haversine approximation for distance
    111.0 * sqrt(
      power(c.lat - user_lat, 2) +
      power((c.lng - user_lng) * cos(radians(user_lat)), 2)
    ) AS distance_km
  FROM cats c
  WHERE
    c.lat BETWEEN user_lat - lat_delta AND user_lat + lat_delta
    AND c.lng BETWEEN user_lng - lng_delta AND user_lng + lng_delta
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
