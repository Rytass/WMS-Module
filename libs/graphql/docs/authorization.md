# Authorization

How `@rytass/wms-module-graphql` lets **you** authorize its resolvers with **your**
permission system — without the library knowing anything about it, and without
your global auth guard rejecting every WMS operation.

- [1. The problem](#1-the-problem)
- [2. The design](#2-the-design)
- [3. Execution order — why it composes](#3-execution-order--why-it-composes)
- [4. Recipe A — member-base / Casbin](#4-recipe-a--member-base--casbin)
- [5. Recipe B — your own JWT / RBAC](#5-recipe-b--your-own-jwt--rbac)
- [6. Recipe C — no global guard / fully open](#6-recipe-c--no-global-guard--fully-open)
- [7. The single coupling point](#7-the-single-coupling-point)
- [8. Public API](#8-public-api)
- [9. FAQ & gotchas](#9-faq--gotchas)

---

## 1. The problem

The library exposes ~66 root `@Query` / `@Mutation` operations. Like any
publishable NestJS GraphQL module, it cannot know how *your* application
authorizes requests — RBAC? ABAC? Casbin? JWT scopes? a custom session table?
So historically its resolvers were **bare** (`@Query()` with no guard metadata).

That collides badly with a **globally registered, deny-by-default guard**. The
canonical example is the `CasbinGuard` that `@rytass/member-base-nestjs-module`
registers as `APP_GUARD`:

```
Host App
  APP_GUARD = CasbinGuard          <- one net over EVERY resolver in the schema
        |
        v
  +------------------------------+
  | compiled GraphQL schema      |
  |  - your resolvers            |  carry @AllowActions -> authorized OK
  |  - WMS resolvers (bare)      |  no metadata -> guard returns false -> ALL denied
  +------------------------------+
```

`CasbinGuard` is white-list: a handler with no `@AllowActions` / `@Authenticated`
/ `@IsPublic` metadata is **rejected**. WMS resolvers had none, so every WMS
query and mutation came back *forbidden*. You could not fix it from the consumer
side either — you do not own the WMS resolver classes, so you cannot decorate
them.

**Conclusion:** the library itself must participate in authorization, while
staying ignorant of which auth system you use.

---

## 2. The design

A host-neutral, opt-in authorization protocol with three moving parts, all
shipped by the library:

| Part | What it is | Who supplies it |
|------|------------|-----------------|
| `@WmsOperation({ resource, action })` | Method decorator on every WMS root op. Declares a **neutral** permission requirement (just two strings) and wires the guard. | Library (already applied) |
| `WmsAuthGuard` | Route-level guard (NOT global) that reads the requirement and delegates the decision. | Library |
| `authChecker` | Your function `(ctx, { resource, action }) => boolean`. Maps WMS's neutral requirement onto your real permission system. | **You**, via `forRootAsync` |

```
WMS resolver
  |
  +- @WmsOperation({ resource: 'material', action: 'read' })
  |     |
  |     +- stamps neutral metadata  ............ read by WmsAuthGuard
  |     +- stamps a host-skip marker ........... tells your global guard to defer
  |     +- @UseGuards(WmsAuthGuard) ............ the guard that actually enforces
  |
  v
WmsAuthGuard.canActivate(ctx)
  |
  +- reads { resource, action } from the handler
  +- calls YOUR authChecker(ctx, { resource, action })
        |
        v
   true -> resolve   /   false -> ForbiddenError
```

Key properties:

- **The library never imports your auth system.** It only knows two strings.
- **`authChecker` is optional.** Omit it and the module stays fully permissive
  (handy for local dev / demos) — identical to the pre-auth releases.
- **`resource` / `action` are internal metadata**, not part of the GraphQL
  schema. Refining them later is *not* a breaking change for GraphQL consumers.
- The host-skip marker is what lets WMS coexist with your global guard — see §3.

---

## 3. Execution order — why it composes

NestJS runs guards in the order **global -> controller -> route**. So a global
`APP_GUARD` (your `CasbinGuard`) runs *before* WMS's route-level `WmsAuthGuard`.
That is exactly why `@WmsOperation` stamps a host-skip marker: it makes the
global guard *defer* on WMS operations so it never blanket-rejects them.

```
request
  |
  v  [1] APP_GUARD = CasbinGuard (global, runs first)
  |        - verifies token, attaches payload/enforcer to the request
  |        - sees host-skip marker (IS_ROUTE_PUBLIC) -> returns true (defers)
  |
  v  [2] @UseGuards(WmsAuthGuard) (route-level, runs next)
  |        - reads { resource, action }
  |        - calls your authChecker -> real allow/deny decision
  |
  v  resolver executes
```

With member-base specifically there is a bonus: before `CasbinGuard` defers on
the skip marker, it has *already* attached the verified `payload`, the Casbin
`enforcer`, and your `casbinPermissionChecker` to the request. The member-base
adapter (§4) reuses those — so WMS enforces with the **exact same** policy
engine and rules as your own resolvers.

> Your global guard configuration does **not** change. You do not whitelist WMS
> routes, you do not enumerate operations, you do not weaken your default-deny
> posture. WMS makes itself transparent to the global guard and self-enforces.

---

## 4. Recipe A — member-base / Casbin

The common case: you use `@rytass/member-base-nestjs-module` with its global
`CasbinGuard`. Use the ready-made adapter from the dedicated subpath.

```ts
// app.module.ts
import { WmsModuleGraphqlModule } from '@rytass/wms-module-graphql';
import { createMemberBaseWmsAuthChecker } from '@rytass/wms-module-graphql/adapters/member-base';

@Module({
  imports: [
    // ...MemberBaseModule.forRoot({ ... }) with its global guard enabled (default)...
    WmsModuleGraphqlModule.forRootAsync({
      // existing core options:
      useFactory: async () => ({}),
      defaultLoaderSerialId: 'DEFAULT',
      defaultLoaderTypeKey: 'DEFAULT',
      defaultLocationKey: 'DEFAULT',

      // authorization:
      authChecker: createMemberBaseWmsAuthChecker({
        // Map WMS resource/action onto YOUR Casbin [subject, action] tuples.
        // This is the one place your permission naming convention lives.
        // Return several tuples to mean "allow if ANY passes" (OR semantics).
        map: ({ resource, action }) => [[`wms:${resource}`, action]],
        //   material + read -> enforce(memberId, domain, 'wms:material', 'read')
      }),
    }),
    // ...your own GraphQLModule.forRootAsync (must expose `req` on context)...
  ],
})
export class AppModule {}
```

What the adapter does, step by step:

1. Pulls the request off the GraphQL `ExecutionContext`
   (`GqlExecutionContext.create(ctx).getContext().req` — member-base's own
   convention).
2. Reads `request.payload` (the JWT member, attached by `CasbinGuard`). Missing
   payload -> **deny** (unauthenticated).
3. Reads `request.enforcer` and `request.casbinPermissionChecker` (also attached
   by `CasbinGuard`). Missing -> **deny** (fail closed: the global guard was not
   actually enabled).
4. Runs `your map({ resource, action })` to get the Casbin tuples.
5. Calls the **consumer's own** `casbinPermissionChecker({ enforcer, payload,
   actions })` and returns its verdict.

The adapter imports **nothing** from member-base — it relies only on the runtime
contract `CasbinGuard` already established on the request. So member-base is not
even a dependency of `@rytass/wms-module-graphql`.

**Prerequisites**

- Keep member-base's global guard enabled (`enableGlobalGuard: true`, the
  default).
- Your `GraphQLModule` context must expose the request as `req` (Apollo's
  default): `context: ({ req }) => ({ ...createWmsLoaders(loaderService), req })`.

**Permission grants.** Make sure your Casbin policy grants the mapped subjects.
With the example `map` above, a warehouse operator role might be granted
`wms:material:read`, `wms:receive-inventory-order:create`, etc. The full list of
`resource` values mirrors the WMS domains (`material`, `loader`, `stock`,
`location`, `unit`, `batch`, `warehouse-map`, `transfer-order`,
`receive-inventory-order`, `ship-inventory-order`, `allocate-inventory-order`,
`hold-inventory-order`, `reclassify-inventory-order`, `transfer-customer-order`,
`transfer-vendor-order`, `sale-order`, `scrape-order`,
`quality-inspection-order`). `action` is `read` for queries, and the leading
verb (`create` / `update` / `delete` / `ship` / `hold` / `allocate` / `split` /
`merge` / `transfer` / ...) for mutations.

---

## 5. Recipe B — your own JWT / RBAC

`authChecker` is a plain function — you do not need Casbin or member-base. Read
whatever you need off the `ExecutionContext` and decide.

```ts
import { GqlExecutionContext } from '@nestjs/graphql';
import type { WmsAuthChecker } from '@rytass/wms-module-graphql';

const myWmsAuthChecker: WmsAuthChecker = (ctx, { resource, action }) => {
  const { req } = GqlExecutionContext.create(ctx).getContext<{ req: { user?: { scopes: string[] } } }>();
  const user = req.user;

  if (!user) return false;                                  // unauthenticated -> deny

  // your own convention; e.g. scopes like "wms:material:read" or "wms:*"
  return user.scopes.includes('wms:*')
    || user.scopes.includes(`wms:${resource}:${action}`)
    || user.scopes.includes(`wms:${resource}:*`);
};

WmsModuleGraphqlModule.forRootAsync({
  useFactory: async () => ({}),
  defaultLoaderSerialId: 'DEFAULT',
  defaultLoaderTypeKey: 'DEFAULT',
  defaultLocationKey: 'DEFAULT',
  authChecker: myWmsAuthChecker,
});
```

`authChecker` may be sync or async (return `Promise<boolean>`). Throwing also
works — the exception propagates exactly like any guard rejection (use a
`ForbiddenException` if you want a clean 403-style GraphQL error).

If you *also* run a global deny-by-default guard that is **not** member-base, you
must make it skip WMS routes too — see §7 to change the host-skip key.

---

## 6. Recipe C — no global guard / fully open

- **No `authChecker`.** The module is permissive: `WmsAuthGuard` lets every
  operation through. The host-skip marker is inert. Good for local dev, internal
  tooling, or demos.

  ```ts
  WmsModuleGraphqlModule.forRootAsync({
    useFactory: async () => ({}),
    defaultLoaderSerialId: 'DEFAULT',
    defaultLoaderTypeKey: 'DEFAULT',
    defaultLocationKey: 'DEFAULT',
    // no authChecker -> open
  });
  ```

- **You guard your own resolvers explicitly** (`@UseGuards(...)` per resolver
  instead of a global `APP_GUARD`). Then there is no net over WMS at all; the
  skip marker does nothing and WMS still self-enforces through your
  `authChecker` if you supply one.

---

## 7. The single coupling point

`@WmsOperation` stamps a host-skip metadata key so your global guard defers. A
global guard reads its skip key *statically* (at decoration time), so the key
must be a fixed value baked into the decorator. The default matches
member-base's:

```ts
// libs/graphql/src/lib/auth/host-skip.constant.ts
export const HOST_SKIP_METADATA_KEY = 'IS_ROUTE_PUBLIC';
```

This is the **only** place WMS assumes anything about a specific host guard. If
your global guard uses a different "public / skip" metadata key, change this one
constant (when building from source) — nothing else moves. If you do not run a
global guard, it is irrelevant.

---

## 8. Public API

Exported from the package root (`@rytass/wms-module-graphql`):

| Export | Kind | Purpose |
|--------|------|---------|
| `WmsOperation(requirement)` | decorator | Annotate a WMS root op (already applied across the library). |
| `WmsAuthGuard` | class | Route-level guard that delegates to `authChecker`. |
| `WmsAuthChecker` | type | `(ctx: ExecutionContext, req: WmsOperationRequirement) => boolean \| Promise<boolean>` |
| `WmsOperationRequirement` | type | `{ readonly resource: string; readonly action: string }` |
| `WmsAuthModuleOptions` | type | `{ readonly authChecker?: WmsAuthChecker }` |
| `WmsModuleGraphqlModuleAsyncOptions` | type | Core async options **+** `WmsAuthModuleOptions`. |
| `WMS_AUTH_OPTIONS` | symbol | DI token holding the resolved auth options. |
| `WMS_OPERATION_METADATA` | string | Reflector key carrying the requirement. |
| `HOST_SKIP_METADATA_KEY` | string | The host-skip metadata key (default `'IS_ROUTE_PUBLIC'`). |

Exported from the adapter subpath (`@rytass/wms-module-graphql/adapters/member-base`):

| Export | Kind | Purpose |
|--------|------|---------|
| `createMemberBaseWmsAuthChecker(options)` | factory | Builds a `WmsAuthChecker` for member-base / Casbin. |
| `MemberBaseWmsAuthCheckerOptions` | type | `{ readonly map: (req: WmsOperationRequirement) => CasbinAction[] }` |
| `CasbinAction` | type | `[string, string]` — a `[subject, action]` tuple. |

`forRootAsync` accepts the optional `authChecker` on its single options object:

```ts
static forRootAsync(options: WmsModuleGraphqlModuleAsyncOptions): DynamicModule;
```

---

## 9. FAQ & gotchas

**"Every WMS query/mutation is forbidden after I added member-base."**
Your global `CasbinGuard` is rejecting bare resolvers. Upgrade to a WMS version
that ships `@WmsOperation` (this protocol) and wire an `authChecker` per §4. You
do not need to touch the global guard.

**Does the GraphQL context need anything special?**
Yes — expose the request as `req` on the context (Apollo's default). Both the
member-base adapter and most custom checkers read `GqlExecutionContext.create(ctx).getContext().req`.

**Is member-base a dependency now?**
No. The adapter reads runtime fields the host's guard attaches to the request;
it imports nothing from member-base. member-base is not in this package's
`dependencies` or `peerDependencies`.

**What about `@ResolveField` resolvers?**
They are intentionally *not* annotated. A field resolver is only ever reached
through a root `@Query`/`@Mutation` that already passed `WmsAuthGuard`, so
authorizing the root op authorizes the whole selection. `WmsAuthGuard` returns
`true` for any handler without a requirement.

**Fail-open or fail-closed?**
The library is permissive only when *you* opt out (no `authChecker`). When an
`authChecker` is configured, missing identity / missing enforcer -> **deny**. The
member-base adapter fails closed.

**Can I change `resource`/`action` strings?**
Yes, freely — they are internal metadata, never exposed in the GraphQL schema.
Changing them only affects your `authChecker` / `map`, never your GraphQL
clients.

---

See also: [Integration Guide §8.5](./integration-guide.md#85-backend-authorization-resolver-level)
· [API Reference](./api-reference.md#rytasswms-module-graphql)
