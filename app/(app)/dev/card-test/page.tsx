'use client'

import { useState } from 'react'

/**
 * Visual test page for shareable card redesign.
 * Shows all 6 tiers × 2 card types (catch + profile) × 2 states (new + existing for catch).
 *
 * Visit: /dev/card-test
 *
 * Each card is rendered as an <img> pointing at the API route with mock query params.
 * NOTE: Requires at least one cat in the database to render real cards.
 * For a fully self-contained visual test, this page also embeds static previews
 * using hardcoded tier parameters.
 */

const TIERS = [
  { key: 'stray', label: 'Stray', dots: 1 },
  { key: 'lurker', label: 'Lurker', dots: 2 },
  { key: 'regular', label: 'Regular', dots: 3 },
  { key: 'localCelebrity', label: 'Local Celebrity', dots: 4 },
  { key: 'streetRoyalty', label: 'Street Royalty', dots: 5 },
  { key: 'urbanLegend', label: 'Urban Legend', dots: 6 },
] as const

type CardType = 'catch-new' | 'catch-existing' | 'profile'

export default function CardTestPage() {
  const [catId, setCatId] = useState('')
  const [sightingId, setSightingId] = useState('')
  const [username, setUsername] = useState('')
  const [activeCards, setActiveCards] = useState<{ type: CardType; url: string; label: string }[]>(
    []
  )

  function generateCatchNew() {
    if (!catId) return
    setActiveCards((prev) => [
      ...prev,
      {
        type: 'catch-new',
        url: `/api/catch-card?catId=${encodeURIComponent(catId)}`,
        label: `Catch (New) — catId: ${catId}`,
      },
    ])
  }

  function generateCatchExisting() {
    if (!sightingId) return
    setActiveCards((prev) => [
      ...prev,
      {
        type: 'catch-existing',
        url: `/api/catch-card?sightingId=${encodeURIComponent(sightingId)}`,
        label: `Catch (Existing) — sightingId: ${sightingId}`,
      },
    ])
  }

  function generateProfile() {
    if (!username) return
    setActiveCards((prev) => [
      ...prev,
      {
        type: 'profile',
        url: `/api/profile-card/${encodeURIComponent(username)}`,
        label: `Profile — @${username}`,
      },
    ])
  }

  function clearAll() {
    setActiveCards([])
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-2xl font-bold">Card Visual Test</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Generate shareable cards to preview the redesigned cream-toned mascot-card system. Enter
          real IDs from your database.
        </p>

        {/* Controls */}
        <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl bg-zinc-800 p-4 md:grid-cols-3">
          {/* Catch Card — New (by catId) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Catch Card (New Discovery)
            </label>
            <input
              type="text"
              placeholder="Cat UUID"
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
            <button
              onClick={generateCatchNew}
              disabled={!catId}
              className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-40"
            >
              Generate New Catch Card
            </button>
          </div>

          {/* Catch Card — Existing (by sightingId) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Catch Card (Existing Sighting)
            </label>
            <input
              type="text"
              placeholder="Sighting UUID"
              value={sightingId}
              onChange={(e) => setSightingId(e.target.value)}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
            <button
              onClick={generateCatchExisting}
              disabled={!sightingId}
              className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-40"
            >
              Generate Existing Catch Card
            </button>
          </div>

          {/* Profile Card */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Profile Card
            </label>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
            <button
              onClick={generateProfile}
              disabled={!username}
              className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:opacity-40"
            >
              Generate Profile Card
            </button>
          </div>
        </div>

        {activeCards.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              {activeCards.length} card{activeCards.length > 1 ? 's' : ''} generated
            </span>
            <button
              onClick={clearAll}
              className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-600"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Rendered cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeCards.map((card, i) => (
            <div key={`${card.url}-${i}`} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-400">{card.label}</span>
              <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.url} alt={card.label} className="h-auto w-full" loading="lazy" />
              </div>
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 underline hover:text-orange-300"
              >
                Open full size ↗
              </a>
            </div>
          ))}
        </div>

        {activeCards.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-20 text-center">
            <p className="text-lg font-medium text-zinc-500">No cards generated yet</p>
            <p className="mt-1 text-sm text-zinc-600">
              Enter a cat ID, sighting ID, or username above to preview the redesigned cards.
            </p>
          </div>
        )}

        {/* Tier reference */}
        <div className="mt-12 rounded-xl bg-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-bold tracking-wider text-zinc-400 uppercase">
            Tier Reference
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {TIERS.map((tier) => (
              <div
                key={tier.key}
                className="flex flex-col items-center gap-1 rounded-lg bg-zinc-700/50 p-3"
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5, 6].map((d) => (
                    <div
                      key={d}
                      className={`h-2 w-2 rounded-full ${d <= tier.dots ? 'bg-orange-400' : 'bg-zinc-600'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-zinc-300">{tier.label}</span>
                <span className="text-[10px] text-zinc-500">Tier {tier.dots}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
