/**
 * Metadata key stamped on every `@WmsOperation` handler so that a host
 * application's *globally registered* auth guard (`APP_GUARD`) treats WMS
 * resolvers as "skip / public" and defers the real authorization decision to
 * {@link WmsAuthGuard}.
 *
 * Why this exists
 * ---------------
 * A deny-by-default global guard — e.g. the `CasbinGuard` from
 * `@rytass/member-base-nestjs-module` — blankets every resolver in the compiled
 * schema, including the ones this library owns. WMS resolvers carry no
 * host-specific permission metadata, so such a guard rejects them all. By
 * stamping this key WMS tells the host guard "let me through", and then runs
 * its own {@link WmsAuthGuard} (wired to the consumer's `authChecker`) to do the
 * actual enforcement.
 *
 * The single coupling point
 * -------------------------
 * The default value matches `@rytass/member-base-nestjs-module`'s
 * `IS_ROUTE_PUBLIC` metadata key. This is the *one and only* place WMS assumes
 * anything about a specific host guard. If your host guard uses a different
 * "public / skip" metadata key, fork this constant — nothing else changes.
 *
 * If you do not register a global guard at all (or set
 * `enableGlobalGuard: false`), this marker is simply inert.
 */
export const HOST_SKIP_METADATA_KEY = 'IS_ROUTE_PUBLIC';
