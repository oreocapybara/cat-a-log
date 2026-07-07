# Cat-A-Log — Hackathon Demo Video Script

**Duration:** 4–5 minutes
**Format:** Solo narrated screencast (voiceover + screen recording)
**Tone:** Conversational, confident, warm. Not corporate, not overly casual.

---

## SECTION 1: The Hook (0:00–0:25)

**[VISUAL: Quick montage — phone camera snapping a photo of a cat on a street, a community Facebook group post asking "has anyone seen this tabby?", a lost cat poster on a pole, a crowded shelter intake form]**

**VOICEOVER:**

> There are over 400 million free-roaming cats worldwide. In every neighborhood, there are cats that people feed, watch out for, and care about — but have no way to track.

**[VISUAL: Cut to — someone scrolling a chaotic Facebook group with dozens of blurry cat posts]**

> Right now, if you want to know if someone's already caring for that orange tabby by the park, your options are… a Facebook group with 300 unorganized posts, or knocking on doors.

**[VISUAL: Cat-A-Log logo animates in — the orange Cat icon in a rounded square, "Cat-A-Log" text fades in below]**

> What if there was a shared, visual catalog for every cat your community encounters? That's Cat-A-Log.

---

## SECTION 2: What It Is (0:25–0:55)

**[VISUAL: Phone screen showing the app's map view with several cat pins visible, slowly zooming in]**

**VOICEOVER:**

> Cat-A-Log is a crowdsourced cat registry. Spot a cat — any cat. Snap a photo. Drop a pin. Now your whole community knows that cat exists, where it hangs out, and whether it needs help.

**[VISUAL: Quick cuts showing — a pin being tapped, a cat card sliding up with photo/name/distance, the filter button being tapped]**

> It's a Pokédex for cats — except instead of catching them, you're mapping them. Neighborhood regulars, strays, ferals, TNR colony cats, even someone's adventurous pet — if you see it, you can log it.

---

## SECTION 3: Live Demo — Tagging a Cat (0:55–2:30)

**[VISUAL: Open the app fresh. Show the login screen briefly — paw print background, Cat icon brand, "Your cats missed you" headline, Google sign-in button]**

**VOICEOVER:**

> Let's walk through the experience. Sign-in is fast — one tap with Google, or email if you prefer. The whole app is a PWA, so it lives right on your home screen like a native app.

**[VISUAL: Tap the orange "+" FAB in the bottom nav. The nav bar disappears, full-screen photo screen appears]**

> To log a cat, you tap the big orange plus button. This is the Tag flow — it's the core of the app.

**[VISUAL: Show the photo screen — camera button and gallery option visible, GPS coordinates loading in the corner]**

> Step one: take a photo. You can use your camera right here, or pick from your gallery. The app grabs your GPS coordinates automatically so we know exactly where this cat was spotted.

**[VISUAL: Take/select a photo. Show the image appearing with the edit (pencil) button. Tap it — show the image editor with crop/rotate tools]**

> Got a photo? You can crop and adjust it right in the app — no switching to another tool. We want a clear shot of the cat for the next step, which is where it gets interesting.

**[VISUAL: Tap next. The Candidates screen loads — shows a "sparkles" analyzing animation, then reveals 1-2 cat cards side by side with a "None of these" button below]**

> This is the AI matching step. Cat-A-Log uses Voyage AI's multimodal embeddings to visually compare your photo against every cat already logged nearby. It asks: "Is this one of these cats?"

**[VISUAL: Highlight the candidate cards — show them displaying photo, name, and distance. Point to "None of these" at the bottom]**

> We show at most two candidates — backed by research on decision fatigue. You tap a match if you recognize the cat, or hit "None of these" to register a new one.

**[VISUAL: Tap "None of these." The Name screen appears — show the name input pre-filled with a random cat name, and the dice button next to it]**

> New cat? Give it a name. We generate a fun random name by default — hit the dice to roll a new one — or type your own. Maybe you already know this cat's name from the neighborhood.

**[VISUAL: Tap the dice button once or twice to show names changing. Then tap Next]**

> Let's call this one "Marmalade."

**[VISUAL: Details screen appears — show the ear-tipped toggle, notes field with character counter, and the three medical tag pills (Needs medical, Possible rabies, Passed away)]**

> Last step: details. Is this cat ear-tipped? That tells the TNR community it's already been spayed or neutered. You can add a short note — "very friendly, hangs out by the bike rack" — and flag any welfare concerns.

**[VISUAL: Toggle ear-tipped on, type a quick note, tap "Save." Show success feedback]**

> And we're done. Four steps: photo, match check, name, details. That cat now exists in the community registry.

---

## SECTION 4: Live Demo — The Map (2:30–3:25)

**[VISUAL: Navigate back to the map. Show the full-screen Leaflet map with multiple cat pins. The search bar at the top shows "5 cats nearby"]**

**VOICEOVER:**

> Now let's see where that cat lives — along with every other cat the community has logged. This is the Map.

**[VISUAL: Tap a cat pin. The preview card slides up from the bottom — showing photo, name, distance ("120m away"), last seen time, and a welfare status color]**

> Tap any pin and you get the quick-look card: photo, name, how far away they are, when they were last spotted. The card color tells you the welfare status at a glance — green means healthy, amber means needs attention.

**[VISUAL: Tap the photo/gallery icon on the card — the gallery modal opens showing multiple sighting photos of the same cat]**

> Tap into the gallery and you'll see every sighting photo of that cat — a visual history of where they've been and how they're doing.

**[VISUAL: Dismiss the card. Pan the map — show the "Search this area" pill appearing at the top. Tap it. New pins load in]**

> Pan around and a "Search this area" pill pops up. Tap it to load cats in the new region. This keeps the map fast — we only fetch what you're looking at.

**[VISUAL: Show the filter button — tap it. The filter sheet slides up with ear-tipped toggle and tag options]**

> Need something specific? Filters let you narrow down — show only ear-tipped cats, or only cats flagged for medical attention. Useful for TNR volunteers checking on their colonies.

**[VISUAL: Tap the search bar — type a cat name. Show results appearing. Tap one — map flies to that cat's pin]**

> Or just search by name. "Marmalade" — there she is. The map flies right to her.

---

## SECTION 5: Technical Architecture (3:25–4:10)

**[VISUAL: Transition to a clean architecture diagram or code snippets on dark background. Keep it visual, not a wall of text]**

**VOICEOVER:**

> Under the hood, Cat-A-Log is built with Next.js 16 on the App Router, TypeScript in strict mode, and Tailwind CSS. It's a progressive web app — installable, fast, works offline-first for photo capture.

**[VISUAL: Show a simplified diagram: Phone → Next.js → Supabase (Auth + Postgres + Storage) → pgvector + Voyage AI]**

> The backend is Supabase — handling auth, Postgres database, and file storage for photos. Every photo gets processed through Voyage AI's multimodal embeddings model to generate a visual fingerprint.

**[VISUAL: Show a quick code snippet of the nearby_cats_by_similarity SQL function, or the pgvector cosine similarity operator `<=>`]**

> Those fingerprints are stored as vectors in Postgres using pgvector. When you tag a new cat, we query nearby cats by GPS first — a bounding box search — then re-rank by visual similarity using cosine distance. That two-stage approach keeps it fast even as the database grows.

**[VISUAL: Show the Row Level Security mention — maybe a quick flash of a policy]**

> Security is baked in. Every table uses Row Level Security — users can only modify their own data. The Voyage API key never touches the client. Auth is handled through Supabase with Google OAuth and session management via a proxy layer.

---

## SECTION 6: Impact & Vision (4:10–4:45)

**[VISUAL: Return to warm, real-world footage or photos of community cats. Maybe a split screen: left side shows the app, right side shows a real cat colony being cared for]**

**VOICEOVER:**

> Cat-A-Log isn't just a fun mapping tool. It's infrastructure for communities that care about animals.

> TNR programs can track which cats have been fixed. Rescue groups can identify cats that need help without duplicate intake. Neighbors can coordinate feeding schedules. And anyone can look up that cat they've been wondering about for months.

**[VISUAL: Show the match voting concept — two cat cards side by side with confirm/deny buttons (even if not fully built yet, show the concept)]**

> Next up: community match voting. When two records might be the same cat, the community decides together — crowdsourced deduplication that gets smarter over time.

**[VISUAL: Final shot — the Cat-A-Log logo centered, tagline fading in below]**

> Every cat has a story. Cat-A-Log makes sure it doesn't get lost.

**[VISUAL: Logo holds for 2 seconds. Fade to black. Show team name / hackathon info]**

---

## RECORDING NOTES

### Screen Recording Tips
- Record on a phone or phone emulator for authentic mobile-first feel
- Use a clean account with 4-5 pre-seeded cats on the map for a populated demo
- Pre-seed cats with varied names, photos, ear-tipped status, and tags for visual diversity
- Have one cat with a medical tag to showcase welfare features
- Keep gestures deliberate and slightly slower than natural — viewers need to track what's happening

### Audio Tips
- Record voiceover separately from screen capture for clean audio
- Speak at a natural pace — slightly energetic but not rushed
- Leave 0.5s pauses between major sections for editing flexibility
- Background music: something warm and slightly upbeat, low volume (suggest: lo-fi or acoustic guitar)

### Editing Tips
- Add subtle zoom-ins on key UI elements when describing them (the FAB, the candidate cards, the dice button)
- Use gentle cross-fades between sections, not hard cuts
- Add text annotations sparingly — only for technical terms or stats that benefit from being read and heard simultaneously
- Total video should land between 4:00–4:30 for best impact (under 5:00 is the hard cap)

### Pre-Demo Data Setup
Seed the database with:
1. **4-5 cats** in a realistic cluster within 500m of each other
2. **At least one cat** with multiple sighting photos (for the gallery demo)
3. **One ear-tipped cat** (to demo the filter)
4. **One cat with a `needs_medical` tag** (to show welfare color on the card)
5. **Varied names** — mix of fun generated names ("Marmalade", "Biscuit") and realistic ones ("Patches")
6. **One cat** that visually resembles the photo you'll use during tagging (to trigger a real AI match on the candidates screen)
