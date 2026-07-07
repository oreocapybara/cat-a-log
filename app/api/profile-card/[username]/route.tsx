import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSightingTier } from '@/lib/sighting-tiers'
import { CARD_TIERS, CARD_NEUTRALS, tierKeyFromNumber, type CardTier } from '@/lib/card-tiers'
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

  // Count sightings per cat
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

  // Determine hero cat (featured or most-spotted)
  const heroCat = (() => {
    if (profile.featured_cat_id) {
      const picked = cats.find((c) => c.id === profile.featured_cat_id)
      if (picked) return picked
    }
    if (cats.length === 0) return null
    return cats.reduce((best, cat) => (cat.timesSpotted > best.timesSpotted ? cat : best), cats[0])
  })()

  const heroSightingTier = heroCat ? getSightingTier(heroCat.timesSpotted) : null
  const tier: CardTier = heroSightingTier
    ? CARD_TIERS[tierKeyFromNumber(heroSightingTier.tier)]
    : CARD_TIERS.stray

  // Collection strip: up to 4 cats excluding hero
  const collectionCats = cats.filter((c) => c.id !== heroCat?.id).slice(0, 4)
  const overflowCount = cats.length - 1 - collectionCats.length // remaining beyond the 4

  // Derived motif values
  const frameStyle = tierFrameStyle(tier)
  const chipStyle = tierChipStyle(tier)
  const photoOutline = tierPhotoOutline(tier)
  const photoDecorations = tierPhotoDecorations(tier)
  const frameShadow = outerFrameShadow(tier)
  const extraPhotoMargin = photoBlockExtraTopMargin(tier.key)

  // Load fonts
  const [fredokaData, nunitoData] = await Promise.all([
    loadGoogleFont('Fredoka', 700),
    loadGoogleFont('Nunito', 600),
  ])

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
        {/* Outer frame */}
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
          {/* Inner card */}
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
              ...frameStyle,
              ...(frameStyle.background ? { background: frameStyle.background } : {}),
            }}
          >
            {/* Header row — tier chip + rarity dots */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${Math.round(22 * S)}px ${Math.round(24 * S)}px ${Math.round(14 * S)}px`,
              }}
            >
              {/* Tier chip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: Math.round(6 * S),
                  backgroundColor: chipStyle.background ?? tier.chipBg,
                  borderRadius: chipStyle.borderRadius ?? Math.round(999),
                  padding: `${Math.round(6 * S)}px ${Math.round(14 * S)}px`,
                  ...(chipStyle.border ? { border: chipStyle.border } : {}),
                }}
              >
                {chipStyle.leadingSvgPath && (
                  <svg
                    width={Math.round(14 * S)}
                    height={Math.round(14 * S)}
                    viewBox="0 0 24 24"
                    fill={chipStyle.glyphColor ?? tier.accent}
                  >
                    <path d={chipStyle.leadingSvgPath} />
                  </svg>
                )}
                <span
                  style={{
                    color: tier.rankNameColor,
                    fontSize: Math.round(15 * S),
                    fontFamily: 'Fredoka',
                    fontWeight: 700,
                  }}
                >
                  {tier.label}
                </span>
              </div>

              {/* Rarity dots */}
              <div style={{ display: 'flex', gap: Math.round(5 * S) }}>
                {([1, 2, 3, 4, 5, 6] as const).map((i) => {
                  const filled = i <= tier.dotsFilled
                  return (
                    <div
                      key={i}
                      style={{
                        width: Math.round(10 * S),
                        height: Math.round(10 * S),
                        borderRadius: 9999,
                        backgroundColor: filled ? tier.accent : '#e0dbd4',
                        boxShadow: rarityDotShadow(tier, filled),
                      }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Photo block — hero cat */}
            {heroCat && (
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
                {/* Photo with white border + tier outline */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    borderRadius: Math.round(24 * S),
                    overflow: 'hidden',
                    border: `${Math.round(9 * S)}px solid #fff`,
                    outline: photoOutline.border,
                    boxShadow: photoOutline.boxShadow,
                    opacity: photoOutline.opacity ?? 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroCat.primary_photo_url}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                    }}
                  />
                </div>

                {/* Tier decorations */}
                {photoDecorations}
              </div>
            )}

            {/* Name + subline */}
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
                {heroCat?.name ?? 'No Cats Yet'}
              </span>
              <span
                style={{
                  color: CARD_NEUTRALS.secondaryText,
                  fontSize: Math.round(16 * S),
                  fontFamily: 'Nunito',
                  fontWeight: 600,
                }}
              >
                @{profile.username}&apos;s top catch
              </span>
            </div>

            {/* 3-stat row */}
            <div
              style={{
                display: 'flex',
                gap: Math.round(8 * S),
                padding: `${Math.round(10 * S)}px ${Math.round(24 * S)}px 0`,
              }}
            >
              {[
                { value: String(cats.length), label: 'DISCOVERED' },
                { value: String(totalSightings), label: 'SIGHTINGS' },
                { value: tier.label, label: 'TIER', highlight: true },
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
                      color: stat.highlight ? tier.rankNameColor : CARD_NEUTRALS.nameColor,
                      fontSize: Math.round(stat.label === 'TIER' ? 14 * S : 18 * S),
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

            {/* Collection strip */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: Math.round(6 * S),
                padding: `${Math.round(10 * S)}px ${Math.round(24 * S)}px ${Math.round(12 * S)}px`,
              }}
            >
              <span
                style={{
                  color: CARD_NEUTRALS.secondaryText,
                  fontSize: Math.round(10 * S),
                  fontFamily: 'Nunito',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                COLLECTION
              </span>
              <div style={{ display: 'flex', gap: Math.round(8 * S) }}>
                {collectionCats.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      width: Math.round(56 * S),
                      height: Math.round(56 * S),
                      borderRadius: Math.round(12 * S),
                      overflow: 'hidden',
                      display: 'flex',
                      border: `${Math.round(2 * S)}px solid ${tier.accent}30`,
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
                {overflowCount > 0 && (
                  <div
                    style={{
                      width: Math.round(56 * S),
                      height: Math.round(56 * S),
                      borderRadius: Math.round(12 * S),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: tier.chipBg,
                      border: `${Math.round(2 * S)}px solid ${tier.accent}20`,
                    }}
                  >
                    <span
                      style={{
                        color: CARD_NEUTRALS.secondaryText,
                        fontSize: Math.round(14 * S),
                        fontFamily: 'Fredoka',
                        fontWeight: 700,
                      }}
                    >
                      +{overflowCount}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
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
                {profile.avatar_url ? (
                  <div
                    style={{
                      width: Math.round(32 * S),
                      height: Math.round(32 * S),
                      borderRadius: 9999,
                      overflow: 'hidden',
                      display: 'flex',
                      border: `${Math.round(2 * S)}px solid ${tier.accent}40`,
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
                      width: Math.round(32 * S),
                      height: Math.round(32 * S),
                      borderRadius: 9999,
                      backgroundColor: tier.accent,
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
                      {username.slice(0, 2).toUpperCase()}
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
                  @{profile.username}
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
