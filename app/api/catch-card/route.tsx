import { ImageResponse } from 'next/og'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSightingTier, getNextTierThreshold } from '@/lib/sighting-tiers'
import {
  CARD_TIERS,
  CARD_NEUTRALS,
  MEDICAL_ALERT,
  tierKeyFromNumber,
  ordinal,
  type CardTier,
} from '@/lib/card-tiers'
import {
  tierFrameStyle,
  tierChipStyle,
  tierPhotoOutline,
  tierPhotoDecorations,
  outerFrameShadow,
  rarityDotShadow,
  photoBlockExtraTopMargin,
} from '@/lib/card-motifs'

// Scale factor: mockup 480px → production 1080px
const S = 2.25

// Load a Google Font binary for Satori (next/og ImageResponse)
async function loadGoogleFont(font: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@${weight}&display=swap`
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)
  if (resource) {
    const response = await fetch(resource[1])
    if (response.status === 200) {
      return await response.arrayBuffer()
    }
  }
  throw new Error(`Failed to load font: ${font} ${weight}`)
}

// Pre-fetch an image and return it as a base64 data URL.
// This prevents Satori from needing to fetch external URLs during render,
// which can crash the stream silently (ERR_EMPTY_RESPONSE).
async function toDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${imageUrl}`)
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:${contentType};base64,${base64}`
}

// ─── Data preparation ───────────────────────────────────────────────────────

type CatchCardData = {
  photoUrl: string
  catName: string
  tier: CardTier
  isNewCatch: boolean
  sightingNumber: number // which sighting this is (1 = first)
  totalSightings: number // total sightings for this cat including initial
  needsMedical: boolean
  progressFraction: number
  progressCaption: string
  discoveredDate: string
  spotterUsername: string
  spotterAvatarUrl: string | null
}

function buildProgressCaption(
  timesSpotted: number,
  tier: CardTier
): { fraction: number; caption: string } {
  const nextThreshold = getNextTierThreshold(timesSpotted)
  if (!nextThreshold || !tier.next) {
    return { fraction: 1, caption: 'Max tier reached' }
  }
  const remaining = nextThreshold - timesSpotted
  const nextTier = CARD_TIERS[tier.next]
  return {
    fraction: timesSpotted / nextThreshold,
    caption: `${remaining} more sighting${remaining === 1 ? '' : 's'} to level up to ${nextTier.label}`,
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    return await generateCatchCard(request)
  } catch (error) {
    console.error('[catch-card] Failed to generate card:', error)
    return NextResponse.json({ error: 'Failed to generate card' }, { status: 500 })
  }
}

async function generateCatchCard(request: NextRequest) {
  const catId = request.nextUrl.searchParams.get('catId')
  const sightingId = request.nextUrl.searchParams.get('sightingId')

  if ((!catId && !sightingId) || (catId && sightingId)) {
    return NextResponse.json(
      { error: 'Provide exactly one of catId or sightingId' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  let data: CatchCardData

  if (catId) {
    // New catch — showing the initial cat discovery
    const { data: cat } = await supabase
      .from('cats')
      .select('id, name, primary_photo_url, tagged_by, created_at')
      .eq('id', catId)
      .single()

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 })
    }

    let taggerUsername = 'someone'
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

    // Check for medical tags
    const { data: tags } = await supabase
      .from('cat_tags')
      .select('tag')
      .eq('cat_id', cat.id)
      .eq('tag', 'needs_medical')

    const needsMedical = (tags?.length ?? 0) > 0
    const tier = CARD_TIERS[tierKeyFromNumber(1)] // new cat = tier 1

    const discoveredDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(cat.created_at))

    const progress = buildProgressCaption(1, tier)

    data = {
      photoUrl: cat.primary_photo_url,
      catName: cat.name ?? 'Unknown Cat',
      tier,
      isNewCatch: true,
      sightingNumber: 1,
      totalSightings: 1,
      needsMedical,
      progressFraction: progress.fraction,
      progressCaption: progress.caption,
      discoveredDate,
      spotterUsername: taggerUsername,
      spotterAvatarUrl: taggerAvatarUrl,
    }
  } else {
    // Existing catch — showing a subsequent sighting
    const { data: sighting } = await supabase
      .from('sightings')
      .select('id, cat_id, photo_url, spotted_by, created_at')
      .eq('id', sightingId!)
      .single()

    if (!sighting) {
      return NextResponse.json({ error: 'Sighting not found' }, { status: 404 })
    }

    const { data: cat } = await supabase
      .from('cats')
      .select('id, name, created_at')
      .eq('id', sighting.cat_id)
      .single()

    if (!cat) {
      return NextResponse.json({ error: 'Cat not found' }, { status: 404 })
    }

    const { count: sightingCount } = await supabase
      .from('sightings')
      .select('id', { count: 'exact', head: true })
      .eq('cat_id', cat.id)

    // Total sightings = initial + all sightings rows
    const timesSpotted = 1 + (sightingCount ?? 0)

    // This sighting's sequence number — count sightings up to and including this one
    const { count: sightingsUpTo } = await supabase
      .from('sightings')
      .select('id', { count: 'exact', head: true })
      .eq('cat_id', cat.id)
      .lte('created_at', sighting.created_at)

    const sightingNumber = 1 + (sightingsUpTo ?? 1) // +1 for initial discovery

    const sightingTier = getSightingTier(timesSpotted)
    const tier = CARD_TIERS[tierKeyFromNumber(sightingTier.tier)]

    // Check for medical tags
    const { data: tags } = await supabase
      .from('cat_tags')
      .select('tag')
      .eq('cat_id', cat.id)
      .eq('tag', 'needs_medical')

    const needsMedical = (tags?.length ?? 0) > 0

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

    const discoveredDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(cat.created_at))

    const progress = buildProgressCaption(timesSpotted, tier)

    data = {
      photoUrl: sighting.photo_url,
      catName: cat.name ?? 'Unknown Cat',
      tier,
      isNewCatch: false,
      sightingNumber,
      totalSightings: timesSpotted,
      needsMedical,
      progressFraction: progress.fraction,
      progressCaption: progress.caption,
      discoveredDate,
      spotterUsername,
      spotterAvatarUrl,
    }
  }

  // ─── Build the card JSX ─────────────────────────────────────────────────

  const frameStyle = tierFrameStyle(data.tier)
  const chipStyle = tierChipStyle(data.tier)
  const photoOutline = tierPhotoOutline(data.tier)
  const photoDecorations = tierPhotoDecorations(data.tier)
  const frameShadow = outerFrameShadow(data.tier)
  const extraPhotoMargin = photoBlockExtraTopMargin(data.tier.key)

  // Load font binaries for Satori
  const [fredokaData, nunitoData] = await Promise.all([
    loadGoogleFont('Fredoka', 700),
    loadGoogleFont('Nunito', 600),
  ])

  // Pre-fetch images as base64 data URLs to prevent Satori from
  // fetching external URLs during render (which crashes the stream silently).
  const photoDataUrl = await toDataUrl(data.photoUrl)
  const avatarDataUrl = data.spotterAvatarUrl ? await toDataUrl(data.spotterAvatarUrl) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: CARD_NEUTRALS.outerBg,
          padding: `${Math.round(26 * S)}px ${Math.round(20 * S)}px`,
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        {/* Outer frame — cream bg, rounded, soft shadow */}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: Math.round(48 * S),
            boxShadow: frameShadow,
            backgroundColor: CARD_NEUTRALS.outerBg,
            padding: Math.round(20 * S),
          }}
        >
          {/* Inner card — white bg, tier-colored border */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: Math.round(36 * S),
              backgroundColor: CARD_NEUTRALS.innerBg,
              overflow: 'visible',
              position: 'relative',
              ...Object.fromEntries(Object.entries(frameStyle).filter(([, v]) => v !== undefined)),
              ...(frameStyle.background ? { background: frameStyle.background } : {}),
            }}
          >
            {/* ─── Header row ─── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${Math.round(22 * S)}px ${Math.round(24 * S)}px ${Math.round(14 * S)}px`,
                position: 'relative',
              }}
            >
              {/* Left: tier chip OR medical tag */}
              {data.needsMedical ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: Math.round(6 * S),
                    backgroundColor: MEDICAL_ALERT.chipBg,
                    border: `${Math.round(2 * S)}px solid ${MEDICAL_ALERT.chipBorder}`,
                    borderRadius: Math.round(999),
                    padding: `${Math.round(6 * S)}px ${Math.round(14 * S)}px`,
                  }}
                >
                  <span
                    style={{
                      color: MEDICAL_ALERT.chipText,
                      fontSize: Math.round(16 * S),
                      fontFamily: 'Fredoka',
                      fontWeight: 700,
                    }}
                  >
                    ✚ Needs Medical
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: Math.round(6 * S),
                    backgroundColor: chipStyle.background ?? data.tier.chipBg,
                    borderRadius: chipStyle.borderRadius ?? Math.round(999),
                    padding: `${Math.round(6 * S)}px ${Math.round(14 * S)}px`,
                    ...(chipStyle.border ? { border: chipStyle.border } : {}),
                  }}
                >
                  {chipStyle.leadingGlyph && (
                    <span
                      style={{
                        color: chipStyle.glyphColor ?? data.tier.accent,
                        fontSize: Math.round(14 * S),
                        fontFamily: 'Fredoka',
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {chipStyle.leadingGlyph}
                    </span>
                  )}
                  <span
                    style={{
                      color: data.tier.rankNameColor,
                      fontSize: Math.round(15 * S),
                      fontFamily: 'Fredoka',
                      fontWeight: 700,
                    }}
                  >
                    {data.tier.label}
                  </span>
                </div>
              )}

              {/* Right: rarity dots (always 6, filled to tier level) */}
              <div style={{ display: 'flex', gap: Math.round(5 * S) }}>
                {([1, 2, 3, 4, 5, 6] as const).map((i) => {
                  const filled = i <= data.tier.dotsFilled
                  return (
                    <div
                      key={i}
                      style={{
                        width: Math.round(10 * S),
                        height: Math.round(10 * S),
                        borderRadius: 9999,
                        backgroundColor: filled ? data.tier.accent : '#e0dbd4',
                        ...(rarityDotShadow(data.tier, filled)
                          ? { boxShadow: rarityDotShadow(data.tier, filled) }
                          : {}),
                      }}
                    />
                  )
                })}
              </div>

              {/* New-catch confetti (5 small shapes in header zone) */}
              {data.isNewCatch && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: Math.round(10 * S),
                      left: Math.round(60 * S),
                      width: Math.round(10 * S),
                      height: Math.round(10 * S),
                      borderRadius: 9999,
                      backgroundColor: '#f97316',
                      opacity: 0.7,
                      transform: 'rotate(15deg)',
                      display: 'flex',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: Math.round(6 * S),
                      left: Math.round(130 * S),
                      width: Math.round(8 * S),
                      height: Math.round(8 * S),
                      backgroundColor: '#ef4444',
                      opacity: 0.7,
                      transform: 'rotate(40deg)',
                      display: 'flex',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: Math.round(14 * S),
                      right: Math.round(80 * S),
                      width: Math.round(12 * S),
                      height: Math.round(12 * S),
                      borderRadius: 9999,
                      backgroundColor: '#cf9f1f',
                      opacity: 0.7,
                      transform: 'rotate(-10deg)',
                      display: 'flex',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: Math.round(8 * S),
                      right: Math.round(140 * S),
                      width: Math.round(9 * S),
                      height: Math.round(9 * S),
                      backgroundColor: '#f97316',
                      opacity: 0.7,
                      transform: 'rotate(25deg)',
                      display: 'flex',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: Math.round(12 * S),
                      left: Math.round(200 * S),
                      width: Math.round(14 * S),
                      height: Math.round(14 * S),
                      borderRadius: 9999,
                      backgroundColor: '#ef4444',
                      opacity: 0.7,
                      transform: 'rotate(-20deg)',
                      display: 'flex',
                    }}
                  />
                </>
              )}
            </div>

            {/* ─── Photo block ─── */}
            <div
              style={{
                display: 'flex',
                position: 'relative',
                margin: `${extraPhotoMargin}px ${Math.round(20 * S)}px 0`,
                borderRadius: Math.round(24 * S),
                overflow: 'visible',
                flex: '1 1 0px',
              }}
            >
              {/* Photo with outline */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  borderRadius: Math.round(24 * S),
                  overflow: 'hidden',
                  border: `${Math.round(9 * S)}px solid #fff`,
                  ...(photoOutline.boxShadow
                    ? {
                        boxShadow: `0 0 0 ${photoOutline.border.split(' ')[0]} ${data.tier.accent}, ${photoOutline.boxShadow}`,
                      }
                    : {}),
                  outline: photoOutline.border,
                  opacity: photoOutline.opacity ?? 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoDataUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                  }}
                />
              </div>

              {/* Tier-specific photo decorations */}
              {photoDecorations}

              {/* Photo badge: NEW CATCH burst or SIGHTING stamp */}
              {data.isNewCatch ? (
                <div
                  style={{
                    position: 'absolute',
                    top: Math.round(-14 * S),
                    left: Math.round(-8 * S),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: data.tier.accent,
                    color: '#fff',
                    fontSize: Math.round(17 * S),
                    fontFamily: 'Fredoka',
                    fontWeight: 700,
                    padding: `${Math.round(10 * S)}px ${Math.round(18 * S)}px`,
                    borderRadius: Math.round(14 * S),
                    border: `${Math.round(4 * S)}px solid #fff`,
                    transform: 'rotate(-8deg)',
                    boxShadow: `0 ${Math.round(8 * S)}px ${Math.round(18 * S)}px rgba(0,0,0,.2)`,
                    zIndex: 10,
                  }}
                >
                  <span style={{ lineHeight: 1 }}>NEW CATCH</span>
                </div>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    bottom: Math.round(14 * S),
                    right: Math.round(6 * S),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fffdf9dd',
                    color: data.tier.accent,
                    fontSize: Math.round(14 * S),
                    fontFamily: 'Fredoka',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    padding: `${Math.round(6 * S)}px ${Math.round(12 * S)}px`,
                    borderRadius: Math.round(8 * S),
                    border: `${Math.round(3 * S)}px solid ${data.tier.accent}aa`,
                    transform: 'rotate(6deg)',
                  }}
                >
                  <span style={{ lineHeight: 1 }}>SIGHTING №{data.sightingNumber}</span>
                </div>
              )}
            </div>

            {/* ─── Name + subline ─── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: Math.round(2 * S),
                padding: `${Math.round(12 * S)}px ${Math.round(24 * S)}px 0`,
              }}
            >
              <span
                style={{
                  color: CARD_NEUTRALS.nameColor,
                  fontSize: Math.round(36 * S),
                  fontFamily: 'Fredoka',
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {data.catName}
              </span>
              <span
                style={{
                  color: data.isNewCatch ? data.tier.rankNameColor : CARD_NEUTRALS.secondaryText,
                  fontSize: Math.round(16 * S),
                  fontFamily: 'Nunito',
                  fontWeight: 600,
                }}
              >
                {data.isNewCatch
                  ? 'First-ever sighting — added to the log'
                  : `${ordinal(data.sightingNumber)} confirmed sighting`}
              </span>
            </div>

            {/* ─── 3-stat row ─── */}
            <div
              style={{
                display: 'flex',
                gap: Math.round(8 * S),
                padding: `${Math.round(10 * S)}px ${Math.round(24 * S)}px 0`,
              }}
            >
              {[
                { value: String(data.totalSightings), label: 'SIGHTINGS' },
                { value: data.discoveredDate, label: 'DISCOVERED' },
                { value: data.tier.label, label: 'TIER RANK', highlight: true },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    padding: `${Math.round(10 * S)}px ${Math.round(8 * S)}px`,
                    backgroundColor: CARD_NEUTRALS.chipStatBg,
                    borderRadius: Math.round(16 * S),
                  }}
                >
                  <span
                    style={{
                      color: stat.highlight ? data.tier.rankNameColor : CARD_NEUTRALS.nameColor,
                      fontSize: Math.round(stat.label === 'TIER RANK' ? 14 * S : 18 * S),
                      fontFamily: 'Fredoka',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}
                  >
                    {stat.value}
                  </span>
                  <span
                    style={{
                      color: CARD_NEUTRALS.secondaryText,
                      fontSize: Math.round(10 * S),
                      fontFamily: 'Nunito',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginTop: Math.round(3 * S),
                    }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ─── Progress bar + caption ─── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: Math.round(4 * S),
                padding: `${Math.round(10 * S)}px ${Math.round(24 * S)}px 0`,
              }}
            >
              {/* Bar */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: Math.round(16 * S),
                  backgroundColor: '#f0e8db',
                  borderRadius: Math.round(8 * S),
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: `${Math.round((data.isNewCatch ? 0.18 : data.progressFraction) * 100)}%`,
                    height: '100%',
                    backgroundColor: data.tier.accent,
                    borderRadius: Math.round(8 * S),
                  }}
                />
              </div>
              {/* Caption */}
              <span
                style={{
                  color: CARD_NEUTRALS.mutedText,
                  fontSize: Math.round(12 * S),
                  fontFamily: 'Nunito',
                  fontWeight: 600,
                }}
              >
                {data.progressCaption}
              </span>
            </div>

            {/* ─── Footer ─── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 'auto',
                padding: `${Math.round(14 * S)}px ${Math.round(24 * S)}px ${Math.round(20 * S)}px`,
                borderTop: `${Math.round(2 * S)}px dashed ${CARD_NEUTRALS.dashedBorder}`,
                marginLeft: Math.round(24 * S),
                marginRight: Math.round(24 * S),
              }}
            >
              {/* Left: avatar + handle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(8 * S) }}>
                {avatarDataUrl ? (
                  <div
                    style={{
                      width: Math.round(32 * S),
                      height: Math.round(32 * S),
                      borderRadius: 9999,
                      overflow: 'hidden',
                      display: 'flex',
                      border: `${Math.round(2 * S)}px solid ${data.tier.accent}40`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarDataUrl!}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: Math.round(32 * S),
                      height: Math.round(32 * S),
                      borderRadius: 9999,
                      backgroundColor: data.tier.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: '#fff',
                        fontSize: Math.round(12 * S),
                        fontFamily: 'Fredoka',
                        fontWeight: 700,
                      }}
                    >
                      {data.spotterUsername.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <span
                  style={{
                    color: CARD_NEUTRALS.secondaryText,
                    fontSize: Math.round(13 * S),
                    fontFamily: 'Nunito',
                    fontWeight: 700,
                  }}
                >
                  @{data.spotterUsername} spotted this
                </span>
              </div>

              {/* Right: brand mark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(4 * S) }}>
                <span style={{ fontSize: Math.round(14 * S), lineHeight: 1 }}>🐾</span>
                <span
                  style={{
                    color: CARD_NEUTRALS.mutedText,
                    fontSize: Math.round(12 * S),
                    fontFamily: 'Nunito',
                    fontWeight: 700,
                  }}
                >
                  cat-a-log.app
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
      fonts: [
        {
          name: 'Fredoka',
          data: fredokaData,
          weight: 700,
          style: 'normal' as const,
        },
        {
          name: 'Nunito',
          data: nunitoData,
          weight: 600,
          style: 'normal' as const,
        },
      ],
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  )
}
