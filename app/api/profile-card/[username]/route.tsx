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

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio, featured_cat_id')
    .eq('username', username)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Fetch user's cats
  const { data: myCats } = await supabase
    .from('cats')
    .select('id, name, primary_photo_url, created_at')
    .eq('tagged_by', profile.id)
    .order('created_at', { ascending: false })

  const catIds = (myCats ?? []).map((cat) => cat.id)

  // Fetch sighting counts
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

  // Determine featured/hero cat
  const heroCat = (() => {
    if (profile.featured_cat_id) {
      const picked = cats.find((c) => c.id === profile.featured_cat_id)
      if (picked) return picked
    }
    if (cats.length === 0) return null
    return cats.reduce((best, cat) => (cat.timesSpotted > best.timesSpotted ? cat : best), cats[0])
  })()

  const heroTier = heroCat ? getSightingTier(heroCat.timesSpotted) : null

  // Get up to 6 recent cats for grid (excluding hero)
  const gridCats = cats.filter((c) => c.id !== heroCat?.id).slice(0, 6)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0a',
          position: 'relative',
        }}
      >
        {heroCat && (
          <div style={{ display: 'flex', position: 'relative', width: '100%', height: '55%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroCat.primary_photo_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '70%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                display: 'flex',
              }}
            />
            {heroTier && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  left: 40,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: `${heroTier.color}33`,
                  borderRadius: 999,
                  padding: '8px 16px',
                }}
              >
                <span
                  style={{
                    color: heroTier.color,
                    fontSize: 24,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {heroTier.name}
                </span>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
            flex: 1,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {profile.avatar_url ? (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    backgroundColor: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'white', fontSize: 36, fontWeight: 700 }}>
                  @{profile.username}
                </span>
                {profile.bio && (
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 22 }}>
                    {profile.bio}
                  </span>
                )}
              </div>
            </div>

            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 26, fontWeight: 600 }}>
              {cats.length} {cats.length === 1 ? 'Cat' : 'Cats'} · {totalSightings}{' '}
              {totalSightings === 1 ? 'Sighting' : 'Sightings'}
            </span>

            {gridCats.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
                {gridCats.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      width: 150,
                      height: 150,
                      borderRadius: 16,
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cat.primary_photo_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
            <span style={{ fontSize: 24 }}>🐾</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 600 }}>
              cat-a-log.app
            </span>
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
