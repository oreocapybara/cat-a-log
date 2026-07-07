---
title: 'Cat-A-Log — App Demo'
duration: '2:45–3:00'
created: '2026-07-07'
status: 'review'
---

# Cat-A-Log — App Demo

**Duration**: 2:45–3:00
**Style**: Product demo / storytelling
**Target Audience**: Hackathon judges, potential users, portfolio viewers

---

## HOOK (0:00 – 0:20)

### VISUAL

Dark background (#1c1917). White text fades in one line at a time, centered on screen. Each line lingers 4 seconds then fades. No app footage yet — pure tension.

Line 1: "You see the same stray cat every day."
Line 2: "So does your neighbor."
Line 3: "But neither of you knows."
Line 4: "What if you could change that?"

### VOICEOVER

"You see the same stray cat every day... so does your neighbor... but neither of you knows. What if you could change that?"

### NOTES

- Speaking pace: slow and deliberate, ~100 wpm
- Music: soft ambient pad fades in at 0:03, builds gently
- No UI yet — let the problem sit with the viewer

---

## LOGO REVEAL (0:20 – 0:25)

### VISUAL

Quick orange wipe transition. Cat-A-Log wordmark scales up (0.9 → 1.0) on dark background. Orange (#f97316) accent on the logo. Tagline underneath: "A community cat registry."

### VOICEOVER

_(silence — just the logo breathing)_

### NOTES

- 5 seconds, no narration — visual punctuation
- Music: subtle beat drop or single piano note on the reveal

---

## SECTION 1: Tag a Cat (0:25 – 1:15)

### VISUAL

Screen recording (portrait). Starts on the map with existing cat markers bouncing in. User taps the orange FAB in the bottom nav. Camera/gallery opens. User selects a cat photo.

Upload processes → candidates screen shows nearby cats by proximity. User taps "None of these — new cat." Name screen: user types "Mochi" (or taps random name generator). Details screen: toggles ear-tipped, adds a note, confirms GPS pin. Submit → success toast + catch card animation.

**Text overlays at bottom-third:**

- 0:28 — "Snap a photo"
- 0:38 — "Nearby cats shown first"
- 0:45 — "Give them a name"
- 1:05 — "Tagged! 🎉"

### VOICEOVER

"Spot a cat? Snap a photo. The app shows you cats already tagged nearby... nope, this one's new. Give them a name... add a few details... and just like that — Mochi is on the map."

### NOTES

- This is the hero sequence — 50 seconds, the longest section
- Existing clip `first-tag.mp4` (85s) can be trimmed to ~50s
- Cut the slow parts: loading spinners, typing hesitation
- Keep the catch card reveal at the end — it's satisfying

---

## SECTION 2: The Map (1:15 – 1:35)

### VISUAL

Map view with multiple cat markers visible. User pans slowly to show the neighborhood. Markers cluster when zoomed out, uncluster when zoomed in. User taps a marker — glassmorphic preview card slides up from the bottom showing cat name, photo, sighting count.

**Text overlay:**

- 1:18 — "Every cat, mapped"

### VOICEOVER

"Every tagged cat lives on the map. Tap one to see their story — who spotted them, how many times, whether they need help."

### NOTES

- Existing clip `map-populates.mp4` (19s) works here
- Smooth slow gestures — the map should feel alive, not frantic
- Show at least 4-5 markers so it feels populated

---

## SECTION 3: AI Match + Welfare Flag (1:35 – 2:15)

### VISUAL

New tag flow begins. User picks a photo of a cat similar to one already in the database. Candidates screen appears — nearby cats shown by proximity. User taps "Check with AI" — the list re-ranks by visual similarity, highlighting the best match. User taps "This is the same cat!" Match confirmation screen shows sighting count incrementing (2 → 3).

Without cutting, user expands the "Community edit" accordion below the catch card. Health flag pills appear — user taps "Needs medical." The amber-highlighted pill shows a checkmark. User saves. Cut to the map — the cat's marker now shows a colored welfare indicator.

**Text overlays:**

- 1:40 — "Nearby cats first"
- 1:48 — "AI ranks by similarity"
- 1:55 — "One tap to confirm"
- 2:00 — "Sighting #3 logged"
- 2:05 — "Spot something wrong?"
- 2:10 — "Flag it for the community"

### VOICEOVER

"But here's where it gets smart. Nearby cats show up first — then hit 'Check with AI' and visual embeddings rank which one's the best match. Same cat? One tap — and the community record grows. Spotted it looking rough? Flag it right there. The whole neighborhood sees it instantly."

### NOTES

- Existing clip `ai-match.mp4` (40s) covers the first half; `welfare-flag.mp4` (30s) covers the second
- Or film as ONE continuous take for smoother storytelling
- This is the emotional peak: smart tech → community care back-to-back
- ~40 seconds total

### NOTES

- Existing clip `welfare-flag.mp4` (30s) — trim to ~20s
- The red/amber color coding must be clearly visible
- Quick but emotionally impactful — this is the "heart" of the app

---

## SECTION 4: Profile & Collection (2:15 – 2:35)

### VISUAL

Profile page — avatar, username, tags count. Featured cat card with hero photo, tier badge (Common/Rare/Legendary), and glow effect. Scroll down to "My Cats" list — rows with photos, names, sighting counts, and colored welfare tag pills. User taps the star on a cat to set it as featured. Taps share profile button.

**Text overlays:**

- 2:18 — "Your collection grows"
- 2:28 — "Pin your favorites. Share your profile."

### VOICEOVER

"Every cat you tag joins your collection. Pin your favorites, watch them level up as sightings grow. Share your profile — show your neighborhood you care."

### NOTES

- Existing clip `catch-card.mp4` (44s) — trim to ~17s
- Focus on the visual delight: tier colors, motif patterns
- End on the share action — leads naturally to closing

---

## CLOSING (2:35 – 2:50)

### VISUAL

Orange wipe transition to dark background. Text fades in:

Line 1: "Every cat, known."
Line 2: "Every neighbor, connected."

Hold 3 seconds. Cat-A-Log logo fades in below in orange. Optional: GitHub URL or QR code at the very end.

### VOICEOVER

"Every cat, known... every neighbor, connected. That's Cat-A-Log."

### NOTES

- Mirror the hook's visual treatment — bookend effect
- Music resolves here — final chord or gentle fade
- Total voiceover word count for the closer: 12 words
- If for a hackathon, add a final 2s card: "Built with Next.js 16 · Supabase · CLIP Embeddings"

---

## Full Voiceover Script (combined)

> You see the same stray cat every day... so does your neighbor... but neither of you knows. What if you could change that?
>
> _(5s pause — logo)_
>
> Spot a cat? Snap a photo. The app shows you cats already tagged nearby... nope, this one's new. Give them a name... add a few details... and just like that — Mochi is on the map.
>
> Every tagged cat lives on the map. Tap one to see their story — who spotted them, how many times, whether they need help.
>
> But here's where it gets smart. Nearby cats show up first — then hit 'Check with AI' and visual embeddings rank which one's the best match. Same cat? One tap — and the community record grows. Spotted it looking rough? Flag it right there. The whole neighborhood sees it instantly.
>
> Every cat you tag joins your collection. Pin your favorites, watch them level up as sightings grow. Share your profile — show your neighborhood you care.
>
> Every cat, known... every neighbor, connected. That's Cat-A-Log.

**Total word count: ~210 words → ~1:24 of speaking at 150 wpm**
**With pauses + footage breathing room → fits comfortably in 3:00**

---

## Production Checklist

### Footage sources

- [x] `first-tag.mp4` — trim from 85s to ~50s
- [x] `map-populates.mp4` — use as-is (19s)
- [x] `ai-match.mp4` — trim from 40s to ~30s
- [x] `welfare-flag.mp4` — trim from 30s to ~20s
- [x] `catch-card.mp4` — trim from 44s to ~17s
- [ ] Title cards (Hook + Logo + Closing) — create in editor
- [ ] Text overlays — add in post

### Audio

- [ ] Background music (lo-fi/ambient, royalty-free)
- [ ] Voiceover recording (or skip for captions-only version)
- [ ] Optional: subtle UI tap sounds

### Quality check before export

- [ ] No notification bars visible in footage
- [ ] Text overlays don't obscure critical UI
- [ ] Music doesn't overpower voiceover
- [ ] Smooth transitions between clips (no jarring cuts)
- [ ] Total runtime ≤ 3:00
