-- ============================================================
-- Fix match_votes UPDATE policy vulnerability
-- Remove overly permissive UPDATE policy and implement
-- trigger-based vote count aggregation
-- ============================================================

-- Drop the insecure UPDATE policy that allowed any authenticated user
-- to arbitrarily modify vote counts and status
DROP POLICY IF EXISTS "System can update match vote counts" ON match_votes;

-- Create trigger function to automatically update vote counts
-- when entries are added to match_vote_entries
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

-- Create trigger to fire after each vote entry insert
CREATE TRIGGER match_vote_entries_after_insert_update_counts
  AFTER INSERT ON match_vote_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_match_vote_counts();

-- Restrict direct calls — only triggers should fire this function
REVOKE EXECUTE ON FUNCTION update_match_vote_counts() FROM PUBLIC, anon, authenticated;
