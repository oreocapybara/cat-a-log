import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSightingTier } from '@/lib/sighting-tiers'

type Props = {
  params: Promise<{ username: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, featured_cat_id')
    .eq('username', username)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: myCats } = await supabase
    .from('cats')
    .select('id, name, primary_photo_url, created_at')
    .eq('tagged_by', profile.id)
    .order('created_at', { ascending: false })

  const catIds = (myCats ?? []).map((cat) => cat.id)

  const sightingCounts = new Map<string, number>()
  if (catIds.length > 0) {
    const { data: sightingRows } = await supabase
      .from('sightings')
      .select('cat_id')
      .in('cat_id', catIds)

    for (const row of sightingRows ?? []) {
      sightingCounts.set(row.cat_id, (sightingCounts.get(row.cat_id) ?? 0) + 1)
    }
  }

  const cats = (myCats ?? []).map((cat) => ({
    ...cat,
    timesSpotted: 1 + (sightingCounts.get(cat.id) ?? 0),
  }))

  const totalSightings = cats.reduce((sum, cat) => sum + cat.timesSpotted, 0)

  const heroCat = (() => {
    if (profile.featured_cat_id) {
      const picked = cats.find((c) => c.id === profile.featured_cat_id)
      if (picked) return picked
    }
    if (cats.length === 0) return null
    return cats.reduce((best, cat) => (cat.timesSpotted > best.timesSpotted ? cat : best), cats[0])
  })()

  const heroTier = heroCat ? getSightingTier(heroCat.timesSpotted) : null

  // Collection preview (up to 4, excluding hero)
  const collectionCats = cats.filter((c) => c.id !== heroCat?.id).slice(0, 4)

  // Card border color based on tier — the "rarity" indicator
  const borderColor = heroTier?.color ?? '#94a3b8'
  const borderGlow = heroTier?.glow
    ? `0 0 40px ${borderColor}60, 0 0 80px ${borderColor}30`
    : `0 0 20px ${borderColor}30`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0c0a09',
          padding: '60px 48px',
        }}
      >
        {/* === THE CARD === */}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 32,
            overflow: 'hidden',
            position: 'relative',
            // Tier-colored border — like a holographic card edge
            border: `4px solid ${borderColor}`,
            boxShadow: borderGlow,
            backgroundColor: '#18181b',
          }}
        >
          {/* Card header — tier name + rarity dots */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 28px 16px',
            }}
          >
            <span
              style={{
                color: borderColor,
                fontSize: 20,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {heroTier?.name ?? 'Stray'}
            </span>
            {/* Tier dots — visual rarity indicator like card games */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor:
                      i <= (heroTier?.tier ?? 1) ? borderColor : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* === ILLUSTRATION WINDOW — the cat photo === */}
          {heroCat && (
            <div
              style={{
                display: 'flex',
                position: 'relative',
                margin: '0 24px',
                borderRadius: 20,
                overflow: 'hidden',
                height: '48%',
                // Inner border like a card illustration frame
                border: `3px solid ${borderColor}30`,
              }}
            >
              <img
                src={heroCat.primary_photo_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Subtle vignette */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  background:
                    'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)',
                }}
              />
            </div>
          )}

          {/* === CARD INFO PANEL === */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '24px 28px',
              justifyContent: 'space-between',
            }}
          >
            {/* Cat name + spotted count */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span
                style={{
                  color: 'white',
                  fontSize: 44,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  textShadow: heroTier?.glow ? `0 0 20px ${borderColor}80` : 'none',
                }}
              >
                {heroCat?.name ?? 'Unknown Cat'}
              </span>
              <span style={{ color: borderColor, fontSize: 22, fontWeight: 600 }}>
                Spotted {heroCat?.timesSpotted ?? 0}× by the community
              </span>
            </div>

            {/* Stats row — card-game style */}
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginTop: 16,
                padding: '16px 0',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <span style={{ color: 'white', fontSize: 32, fontWeight: 800 }}>{cats.length}</span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Discovered
                </span>
              </div>
              <div
                style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex' }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <span style={{ color: 'white', fontSize: 32, fontWeight: 800 }}>
                  {totalSightings}
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Sightings
                </span>
              </div>
              <div
                style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex' }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <span style={{ color: borderColor, fontSize: 32, fontWeight: 800 }}>
                  {heroTier?.tier ?? 1}
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Tier
                </span>
              </div>
            </div>

            {/* Collection strip */}
            {collectionCats.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {collectionCats.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      overflow: 'hidden',
                      display: 'flex',
                      border: '2px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <img
                      src={cat.primary_photo_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
                {cats.length > 5 && (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: '2px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 700 }}>
                      +{cats.length - 5}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* === CARD FOOTER — Trainer info + branding === */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 'auto',
                paddingTop: 16,
              }}
            >
              {/* Trainer (user) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {profile.avatar_url ? (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      overflow: 'hidden',
                      display: 'flex',
                      border: `2px solid ${borderColor}40`,
                    }}
                  >
                    <img
                      src={profile.avatar_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      backgroundColor: '#f97316',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 600 }}>
                  @{profile.username}
                </span>
              </div>

              {/* Branding — subtle, card-game style */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>🐾</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: 600 }}>
                  Cat-A-Log
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  )
}
