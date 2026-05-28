// Ambient declaration for the global `FC` alias the migrated WMS
// components rely on. apps/client previously kept this in its own
// index.d.ts; consumers of the published lib pick it up automatically
// via the side-effect import from src/index.ts.
//
// Wildcard module declarations (*.scss, *.svg) live in consumers' own
// next-env.d.ts / framework setup — they cannot be declared from a
// module file (this file becomes a module because of declare global).

declare global {
  type FC<Props = unknown> = React.FunctionComponent<
    Props & { children?: React.ReactNode }
  >;
}

export {};
