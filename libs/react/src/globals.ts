// Ambient declarations that the migrated WMS components rely on globally:
// - `FC` mirrors the pre-React-18 `FunctionComponent` signature which
//   implicitly accepts `children` (the apps/client codebase relied on a
//   global declaration of the same shape before this lib existed).
// - `*.scss` and `*.svg` module declarations cover the CSS Modules and
//   svg imports used by the migrated components, so consumers do not
//   have to redeclare them in their own ambient types.

import type { ReactNode } from 'react';

declare global {
  type FC<Props = unknown> = React.FunctionComponent<
    Props & { children?: ReactNode }
  >;
}

declare module '*.scss';

declare module '*.svg' {
  const content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const ReactComponent: any;
  export default content;
}

export {};
