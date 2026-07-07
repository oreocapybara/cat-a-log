# API Routes

All routes are under `/api/`. They require authentication (valid Supabase session) unless noted otherwise.

## POST `/api/catch-cat`

Create a new cat record with optional welfare tags.

**Request body (JSON):**

```json
{
  "photoUrl": "https://...supabase.co/storage/v1/object/public/cat-photos/...",
  "lat": 14.5995,
  "lng": 120.9842,
  "name": "Whiskers",
  "isEarTipped": false,
  "notes": "Friendly, often seen near the park bench",
  "tags": ["needs_medical"]
}
```

| Field         | Type         | Required | Notes                                                    |
| ------------- | ------------ | -------- | -------------------------------------------------------- |
| `photoUrl`    | string       | Yes      | Public URL from `cat-photos` storage bucket              |
| `lat`         | number       | Yes      | Latitude                                                 |
| `lng`         | number       | Yes      | Longitude                                                |
| `name`        | string       | Yes      | Cat name (can be empty string)                           |
| `isEarTipped` | boolean      | Yes      | Whether the cat has a TNR ear tip                        |
| `notes`       | string\|null | Yes      | Optional notes (≤500 chars)                              |
| `tags`        | string[]     | Yes      | Subset of `needs_medical`, `possible_rabies`, `deceased` |

**Response:**

```json
{ "catId": "uuid" }
```

**Errors:** `401` (not authenticated), `500` (database error)

**Side effects:** Generates a photo embedding via Voyage AI (non-blocking; failure doesn't prevent the catch).

---

## POST `/api/match`

Re-rank a set of candidate cats by visual similarity to an uploaded photo. Used in the tagging flow to surface potential duplicates.

**Request body (multipart/form-data):**

| Field             | Type   | Required | Notes                               |
| ----------------- | ------ | -------- | ----------------------------------- |
| `image`           | File   | Yes      | The photo to compare against        |
| `candidateCatIds` | string | Yes      | JSON-stringified array of cat UUIDs |

**Response:**

```json
{ "rankedIds": ["uuid-most-similar", "uuid-next", "..."] }
```

**Errors:** `400` (missing fields), `500` (database error), `502` (embedding generation failed)

**Notes:** Requires `VOYAGE_API_KEY` to be set. Without it, the endpoint will return `502`.

---

## POST `/api/refresh-cat-embedding`

Regenerate the photo embedding for an existing cat. Called after a photo is uploaded/changed.

**Request body (JSON):**

```json
{
  "catId": "uuid",
  "photoUrl": "https://...supabase.co/storage/v1/object/public/cat-photos/..."
}
```

**Response:**

```json
{ "ok": true }
```

**Errors:** `401` (not authenticated)

**Notes:** Silently succeeds even if embedding generation fails — it's a best-effort enhancement.

---

## GET `/api/catch-card?catId={uuid}&sightingId={uuid}`

Generate a shareable OG image (1080×1080 PNG) for a cat sighting. Used for social sharing and link previews.

**Query parameters:**

| Param        | Required | Notes                                  |
| ------------ | -------- | -------------------------------------- |
| `catId`      | Yes      | The cat to generate a card for         |
| `sightingId` | No       | Specific sighting (defaults to latest) |

**Response:** `image/png` (1080×1080)

The card includes the cat's photo, name, tier (based on sighting count), spotter info, and welfare status.

---

## GET `/api/profile-card/[username]`

Generate a shareable OG image (1080×1080 PNG) for a user's profile. Shows their cats, stats, and featured cat.

**URL parameter:** `username` — the profile's username

**Response:** `image/png` (1080×1080)

**Errors:** `404` (profile not found)
