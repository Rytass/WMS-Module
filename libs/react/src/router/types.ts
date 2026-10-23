// Router-agnostic navigation contract consumed by every WMS page component.
//
// The lib core never imports `next/router` (Pages) or `next/navigation`
// (App) directly — those imports are mutually exclusive per Next.js router
// mode. Instead a consumer mounts one of the bridge providers
// (`@rytass/wms-module-react/router/{pages,app}`) at the app root, which
// adapts the active Next router into this shape and injects it via context.
export interface WmsRouterAdapter {
  push: (url: string) => void;
  replace: (url: string) => void;
  back: () => void;
  // Dynamic route params (e.g. `[id]`). Pages bridge sources this from
  // `router.query`; App bridge from `next/navigation`'s `useParams()`.
  // Search-string params (`?tab=`) are NOT read here — components use nuqs
  // (`useQueryState`) for those, which is already router-mode-agnostic.
  params: Record<string, string | string[] | undefined>;
}
