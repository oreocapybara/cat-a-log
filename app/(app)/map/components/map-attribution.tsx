// Leaflet's own attribution control anchors to the map container's true bottom
// edge — on this full-bleed map that's underneath the fixed bottom nav, so it
// renders invisible. We disable it (see attributionControl={false} on
// MapContainer in cat-map.tsx) and render the required OSM/CARTO links
// ourselves instead, tucked in the ~32px gap between the locate button
// (bottom-28) and the nav bar (bottom-4), right-aligned with both. No
// explicit z-index — that leaves it painted below every other control on
// this screen (all of which opt into z-10), so the cat preview card is
// meant to cover it when a cat is selected rather than the reverse.
export function MapAttribution() {
  return (
    <div className="bg-card/60 dark:bg-card/70 text-muted-foreground dark:text-foreground/70 absolute right-4 bottom-[88px] flex items-center gap-1 rounded-full border border-white/40 px-1.5 py-0.5 text-[8px] leading-none shadow-sm backdrop-blur-md dark:border-white/15">
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground"
      >
        © OpenStreetMap
      </a>
      <span aria-hidden>·</span>
      <a
        href="https://carto.com/attributions"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground"
      >
        CARTO
      </a>
    </div>
  )
}
