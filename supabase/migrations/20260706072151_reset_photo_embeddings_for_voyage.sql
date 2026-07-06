-- ============================================================
-- RESET PHOTO EMBEDDINGS FOR VOYAGE AI MIGRATION
-- Existing photo_embedding values were computed with the local CLIP
-- model (Xenova/clip-vit-base-patch32) that has been replaced by Voyage
-- AI's voyage-multimodal-3 hosted embeddings. Both output 512-dim
-- vectors, but the two models' vector spaces are not comparable —
-- comparing an old CLIP vector against a new Voyage vector via cosine
-- distance produces meaningless similarity scores. Clear the stale
-- vectors so nearby_cats_by_similarity only ever compares vectors from
-- the same embedding space; cats naturally get a fresh embedding next
-- time they're tagged or re-sighted.
-- ============================================================

UPDATE cats SET photo_embedding = NULL WHERE photo_embedding IS NOT NULL;
