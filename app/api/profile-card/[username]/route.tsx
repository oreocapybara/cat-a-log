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

  // Up to 4 cats for the collection strip (excluding hero)
  const collectionCats = cats.filter((c) => c.id !== heroCat?.id).slice(0, 4)

  // Psychology: the card tells a story in 3 seconds of glancing:
  // 1. HERO IMAGE — "wow, cute/interesting cat" (emotional hook)
  // 2. TIER + STATS — "this is rare/impressive" (status/envy)
  // 3. PERSON + CTA — "someone real did this, I could too" (belonging + action)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0c0a09',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* === SECTION 1: HERO IMAGE (60%) — The Emotional Hook === */}
        {heroCat && (
          <div style={{ display: 'flex', position: 'relative', width: '100%', height: '58%' }}>
            <img
              src={heroCat.primary_photo_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Dramatic vignette — draws eye to center of photo */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                background:
                  'radial-gradient(ellipse at center, transparent 40%, rgba(12,10,9,0.7) 100%)',
              }}
            />

            {/* Bottom gradient for text readability */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '50%',
                display: 'flex',
                background: 'linear-gradient(to top, #0c0a09, transparent)',
              }}
            />

            {/* Hero cat name + tier — overlaid on photo for maximum impact */}
            <div
              style={{
                position: 'absolute',
                bottom: 32,
                left: 48,
                right: 48,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Cat name — large, bold, the star of the show */}
              <span
                style={{
                  color: 'white',
                  fontSize: 56,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  textShadow: '0 2px 20px rgba(0,0,0,0.8)',
                }}
              >
                {heroCat.name ?? 'Unknown Cat'}
              </span>

              {/* Tier badge — THE status symbol that creates envy */}
              {heroTier && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 20px',
                      borderRadius: 999,
                      backgroundColor: `${heroTier.color}25`,
                      border: `2px solid ${heroTier.color}60`,
                    }}
                  >
                    <span
                      style={{
                        color: heroTier.color,
                        fontSize: 22,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        textShadow: heroTier.glow
                          ? `0 0 20px ${heroTier.color}, 0 0 40px ${heroTier.color}80`
                          : 'none',
                      }}
                    >
                      {heroTier.name}
                    </span>
                  </div>
                  {/* Spotted count — social proof number */}
                  <span
                    style={{
                      color: heroTier.color,
                      fontSize: 22,
                      fontWeight: 700,
                      opacity: 0.9,
                    }}
                  >
                    Spotted {heroCat.timesSpotted}×
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === SECTION 2: PROFILE INFO — Social Proof + Collection === */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '36px 48px',
            justifyContent: 'space-between',
          }}
        >
          {/* Profile identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Avatar + name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {profile.avatar_url ? (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    overflow: 'hidden',
                    display: 'flex',
                    border: '3px solid rgba(255,255,255,0.15)',
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
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    backgroundColor: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: 'white', fontSize: 34, fontWeight: 700 }}>
                  @{profile.username}
                </span>
                {/* Stats — creates "impressive collection" feeling */}
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 500 }}>
                  {cats.length} {cats.length === 1 ? 'cat' : 'cats'} discovered · {totalSightings}{' '}
                  {totalSightings === 1 ? 'sighting' : 'sightings'}
                </span>
              </div>
            </div>

            {/* Collection strip — shows breadth, creates "I want this" feeling */}
            {collectionCats.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 16,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  Collection
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {collectionCats.map((cat, i) => (
                    <div
                      key={cat.id}
                      style={{
                        width: 120,
                        height: 120,
                        borderRadius: 16,
                        overflow: 'hidden',
                        display: 'flex',
                        opacity: 1 - i * 0.12,
                        border: '2px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <img
                        src={cat.primary_photo_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                  {/* "More" indicator — creates curiosity gap */}
                  {cats.length > 5 && (
                    <div
                      style={{
                        width: 120,
                        height: 120,
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '2px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span
                        style={{ color: 'rgba(255,255,255,0.5)', fontSize: 24, fontWeight: 700 }}
                      >
                        +{cats.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* === SECTION 3: CTA — The Conversion Hook === */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: 24,
            }}
          >
            {/* Branding + CTA that creates action intent */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 22, fontWeight: 700 }}>
                🐾 Cat-A-Log
              </span>
              <span style={{ color: '#f97316', fontSize: 18, fontWeight: 600 }}>
                Discover the strays around you
              </span>
            </div>
            {/* Fake button — visual CTA that implies tappability */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 24px',
                borderRadius: 999,
                backgroundColor: '#f97316',
              }}
            >
              <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Join the hunt</span>
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
