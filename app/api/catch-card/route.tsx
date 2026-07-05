import { ImageResponse } from 'next/og'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSightingTier, getNextTierThreshold } from '@/lib/sighting-tiers'
import { getCatchCardFoil } from '@/lib/catch-card-seed'

const NEW_DISCOVERY_COLOR = '#eab308'

type CardData = {
  photoUrl: string
  catName: string
  badgeLabel: string
  badgeColor: string
  rarityDots: number // 0 disables the dots and shows sequenceLabel instead
  sequenceLabel: string
  subline: string
  progressLabel: string
  progressFraction: number
  progressCaption: string
  extraCaption: string | null
  footerLabel: string
  footerAvatarUrl: string | null
  foilAngle: number
  foilOffset: number
}

function buildProgress(timesSpotted: number, catName: string) {
  const nextThreshold = getNextTierThreshold(timesSpotted)
  const nextTier = nextThreshold ? getSightingTier(nextThreshold) : null
  const fraction = nextThreshold ? timesSpotted / nextThreshold : 1
  const label = nextTier ? `Next tier: ${nextTier.name}` : 'Max tier reached'
  const remaining = nextThreshold ? nextThreshold - timesSpotted : 0
  const caption = nextThreshold
    ? `${remaining} more sighting${remaining === 1 ? '' : 's'} to level ${catName} up`
    : `${catName} has reached the top tier`
  return { fraction, label, caption }
}

export async function GET(request: NextRequest) {
  const catId = request.nextUrl.searchParams.get('catId')
  const sightingId = request.nextUrl.searchParams.get('sightingId')

  if ((!catId && !sightingId) || (catId && sightingId)) {
    return NextResponse.json(
      { error: 'Provide exactly one of catId or sightingId' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  let data: CardData

  if (catId) {
    const { data: cat } = await supabase
      .from('cats')
      .select('id, name, primary_photo_url, tagged_by, created_at')
      .eq('id', catId)
      .single()

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 })
    }

    let taggerUsername = 'a new tagger'
    let taggerAvatarUrl: string | null = null
    if (cat.tagged_by) {
      const { data: tagger } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', cat.tagged_by)
        .single()
      if (tagger) {
        taggerUsername = tagger.username
        taggerAvatarUrl = tagger.avatar_url
      }
    }

    const { count: registryNumber } = await supabase
      .from('cats')
      .select('id', { count: 'exact', head: true })
      .lte('created_at', cat.created_at)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: weekCount } = await supabase
      .from('cats')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo)

    const catName = cat.name ?? 'Your cat'
    const spottedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(cat.created_at))
    const progress = buildProgress(1, catName)
    const weekTotal = weekCount ?? 1

    const foil = getCatchCardFoil(catId)
    data = {
      photoUrl: cat.primary_photo_url,
      catName,
      badgeLabel: '✨ New Species',
      badgeColor: NEW_DISCOVERY_COLOR,
      rarityDots: 0,
      sequenceLabel: `#${registryNumber ?? 1}`,
      subline: `First spotted ${spottedDate}`,
      progressLabel: progress.label,
      progressFraction: progress.fraction,
      progressCaption: progress.caption,
      extraCaption: `${weekTotal} cat${weekTotal === 1 ? '' : 's'} tagged this week`,
      footerLabel: `@${taggerUsername} discovered this`,
      footerAvatarUrl: taggerAvatarUrl,
      foilAngle: foil.angleDeg,
      foilOffset: foil.offsetPercent,
    }
  } else {
    const { data: sighting } = await supabase
      .from('sightings')
      .select('id, cat_id, photo_url, spotted_by')
      .eq('id', sightingId!)
      .single()

    if (!sighting) {
      return NextResponse.json({ error: 'Sighting not found' }, { status: 404 })
    }

    const { data: cat } = await supabase
      .from('cats')
      .select('id, name')
      .eq('id', sighting.cat_id)
      .single()

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 })
    }

    const { count: sightingCount } = await supabase
      .from('sightings')
      .select('id', { count: 'exact', head: true })
      .eq('cat_id', cat.id)

    const timesSpotted = 1 + (sightingCount ?? 0)
    const tier = getSightingTier(timesSpotted)

    let spotterUsername = 'someone'
    let spotterAvatarUrl: string | null = null
    if (sighting.spotted_by) {
      const { data: spotter } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', sighting.spotted_by)
        .single()
      if (spotter) {
        spotterUsername = spotter.username
        spotterAvatarUrl = spotter.avatar_url
      }
    }

    const catName = cat.name ?? 'This cat'
    const progress = buildProgress(timesSpotted, catName)

    const foil = getCatchCardFoil(sightingId!)
    data = {
      photoUrl: sighting.photo_url,
      catName,
      badgeLabel: tier.name,
      badgeColor: tier.color,
      rarityDots: tier.tier,
      sequenceLabel: '',
      subline: `Spotted ${timesSpotted}× by the community`,
      progressLabel: progress.label,
      progressFraction: progress.fraction,
      progressCaption: progress.caption,
      extraCaption: null,
      footerLabel: `@${spotterUsername} spotted this`,
      footerAvatarUrl: spotterAvatarUrl,
      foilAngle: foil.angleDeg,
      foilOffset: foil.offsetPercent,
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          padding: '80px 56px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            borderRadius: 36,
            padding: 6,
            background: `linear-gradient(135deg, ${data.badgeColor}, ${data.badgeColor}80, ${data.badgeColor}40, ${data.badgeColor}80, ${data.badgeColor})`,
            boxShadow: `0 0 40px ${data.badgeColor}30, inset 0 0 40px ${data.badgeColor}08`,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 30,
              overflow: 'hidden',
              backgroundColor: '#18181b',
              border: '2px solid rgba(255,255,255,0.06)',
              position: 'relative',
            }}
          >
            {/* foil shimmer — stripes + sweep, angle/offset seeded per catch */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                background: `repeating-linear-gradient(${data.foilAngle}deg, transparent 0px, transparent 14px, ${data.badgeColor}26 14px, ${data.badgeColor}26 18px, transparent 18px, transparent 32px)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                background: `linear-gradient(${data.foilAngle}deg, transparent ${data.foilOffset - 15}%, rgba(255,255,255,0.12) ${data.foilOffset}%, transparent ${data.foilOffset + 15}%)`,
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '22px 28px 14px',
                position: 'relative',
              }}
            >
              <span
                style={{
                  color: data.badgeColor,
                  fontSize: 20,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {data.badgeLabel}
              </span>
              {data.rarityDots > 0 ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor:
                          i <= data.rarityDots ? data.badgeColor : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: 700 }}>
                  {data.sequenceLabel}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                position: 'relative',
                margin: '0 20px',
                borderRadius: 20,
                overflow: 'hidden',
                height: '44%',
                border: `3px solid ${data.badgeColor}40`,
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.photoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
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

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '20px 28px 22px',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: 'white', fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>
                  {data.catName}
                </span>
                <span style={{ color: data.badgeColor, fontSize: 20, fontWeight: 600 }}>
                  {data.subline}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {data.progressLabel}
                </span>
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    height: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width: `${Math.round(data.progressFraction * 100)}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${data.badgeColor}, ${data.badgeColor}cc)`,
                    }}
                  />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  {data.progressCaption}
                </span>
                {data.extraCaption && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>
                    {data.extraCaption}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${data.badgeColor}15`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {data.footerAvatarUrl ? (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        overflow: 'hidden',
                        display: 'flex',
                        border: `2px solid ${data.badgeColor}30`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.footerAvatarUrl}
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
                      🐾
                    </div>
                  )}
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: 600 }}>
                    {data.footerLabel}
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
