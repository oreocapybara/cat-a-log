-- ============================================================
-- CAT PHOTOS STORAGE BUCKET
-- Public bucket for cats.primary_photo_url and sightings.photo_url
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('cat-photos', 'cat-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Cat photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cat-photos');

CREATE POLICY "Authenticated users can upload cat photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cat-photos' AND auth.role() = 'authenticated');
