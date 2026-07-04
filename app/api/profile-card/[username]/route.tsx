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

  const collectionCats = cats.filter((c) => c.id !== heroCat?.id).slice(0, 4)

  // Card visual system — tier drives the border color
  const borderColor = heroTier?.color ?? '#94a3b8'
  const cardGlow = heroTier?.glow
    ? `0 0 60px ${borderColor}40, 0 0 120px ${borderColor}20, inset 0 0 60px ${borderColor}10`
    : `0 0 30px ${borderColor}20, inset 0 0 30px ${borderColor}05`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Dark surround — safe zone for 4:5 and 1:1 crops
          backgroundColor: '#09090b',
          padding: '80px 56px',
        }}
      >
        {/* === OUTER CARD BORDER — the holographic edge === */}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            borderRadius: 36,
            padding: 6,
            // Tier-colored outer border — the "holographic" edge
            background: `linear-gradient(135deg, ${borderColor}, ${borderColor}80, ${borderColor}40, ${borderColor}80, ${borderColor})`,
            boxShadow: cardGlow,
          }}
        >
          {/* === INNER CARD BODY === */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 30,
              overflow: 'hidden',
              backgroundColor: '#18181b',
              // Inner border for depth
              border: '2px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Card header — tier label + rarity dots */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '22px 28px 14px',
              }}
            >
              <span
                style={{
                  color: borderColor,
                  fontSize: 20,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  textShadow: heroTier?.glow ? `0 0 10px ${borderColor}80` : 'none',
                }}
              >
                {heroTier?.name ?? 'Stray'}
              </span>
              {/* Rarity dots */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor:
                        i <= (heroTier?.tier ?? 1) ? borderColor : 'rgba(255,255,255,0.08)',
                      boxShadow:
                        i <= (heroTier?.tier ?? 1) && heroTier?.glow
                          ? `0 0 6px ${borderColor}`
                          : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* === ILLUSTRATION WINDOW === */}
            {heroCat && (
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  margin: '0 20px',
                  borderRadius: 20,
                  overflow: 'hidden',
                  height: '44%',
                  // Illustration frame border
                  border: `3px solid ${borderColor}40`,
                  boxShadow: `inset 0 0 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)`,
                }}
              >
                <img
                  src={heroCat.primary_photo_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Corner vignette */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    background:
                      'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
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
                padding: '20px 28px 22px',
                justifyContent: 'space-between',
              }}
            >
              {/* Cat name + spotted */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span
                  style={{
                    color: 'white',
                    fontSize: 40,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    textShadow: heroTier?.glow ? `0 0 20px ${borderColor}60` : 'none',
                  }}
                >
                  {heroCat?.name ?? 'Unknown Cat'}
                </span>
                <span style={{ color: borderColor, fontSize: 20, fontWeight: 600 }}>
                  Spotted {heroCat?.timesSpotted ?? 0}× by the community
                </span>
              </div>

              {/* Stats panel — card-game style */}
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  marginTop: 14,
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: `1px solid ${borderColor}20`,
                }}
              >
                {[
                  { value: cats.length, label: 'Discovered' },
                  { value: totalSightings, label: 'Sightings' },
                  { value: heroTier?.tier ?? 1, label: 'Tier', highlight: true },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      padding: '14px 0',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRight: i < 2 ? `1px solid ${borderColor}15` : 'none',
                    }}
                  >
                    <span
                      style={{
                        color: stat.highlight ? borderColor : 'white',
                        fontSize: 28,
                        fontWeight: 800,
                      }}
                    >
                      {stat.value}
                    </span>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginTop: 2,
                      }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Collection strip */}
              {collectionCats.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {collectionCats.map((cat) => (
                    <div
                      key={cat.id}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        overflow: 'hidden',
                        display: 'flex',
                        border: `2px solid ${borderColor}20`,
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
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: `2px solid ${borderColor}20`,
                      }}
                    >
                      <span
                        style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: 700 }}
                      >
                        +{cats.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Card footer — trainer + branding */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'auto',
                  paddingTop: 14,
                  borderTop: `1px solid ${borderColor}15`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {profile.avatar_url ? (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        overflow: 'hidden',
                        display: 'flex',
                        border: `2px solid ${borderColor}30`,
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
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        backgroundColor: '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 600 }}>
                    @{profile.username}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🐾</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: 600 }}>
                    cat-a-log.app
                  </span>
                </div>
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
