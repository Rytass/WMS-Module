# Documentation

Reference material for consumers of `@rytass/wms-module-{core,graphql,react}`.

## Contents

| Document                                       | Description                                                                                       |
|------------------------------------------------|---------------------------------------------------------------------------------------------------|
| [Integration Guide](./integration-guide.md)    | Step-by-step instructions for wiring the three packages into a new consumer project (NestJS + Next.js + PostgreSQL). Includes ready-to-paste `_app.tsx`, `app.module.ts`, `next.config.ts`, the 19 Pages Router shell pattern, AuthGuard stub, seed script template, deployment notes, and known issues. |
| [API Reference](./api-reference.md)            | Complete export catalog for all three packages — every NestJS module, TypeORM entity, GraphQL resolver, DTO, React component, hook, and utility, organized by role with source paths and usage examples. Mirrors the actual `src/index.ts` barrel exports of `@rytass/wms-module-graphql@0.3.0` and `@rytass/wms-module-{core,react}@0.1.6`. |

## Quick links

- Reference implementation: the maintainers' standalone consumer demo at `~/Downloads/wms-standalone`.
- This monorepo's `apps/api` (NestJS backend) and `apps/client` (Next.js frontend) are the dogfooded equivalents.
- Release process: see [`RELEASING.md`](../RELEASING.md).

## Audience

| If you want to...                                       | Start at...                                                            |
|---------------------------------------------------------|------------------------------------------------------------------------|
| Stand up a new WMS consumer from scratch                | [Integration Guide section 3](./integration-guide.md#3-quick-start-60-seconds) |
| Look up a specific export's signature                   | [API Reference](./api-reference.md)                                    |
| Understand why the lib needs `transpilePackages`        | [Integration Guide section 5.3](./integration-guide.md#53-appsclientnextconfigts) |
| Replace the `AuthGuard` stub with real auth             | [Integration Guide section 8.4](./integration-guide.md#84-real-auth-integration) |
| Decide between PostgreSQL and SQLite                    | [Integration Guide section 9](./integration-guide.md#9-database-support-matrix) |
| Build a custom UI on top of the lib's GraphQL operations| [Integration Guide section 7.3](./integration-guide.md#73-graphql-operations--typed-hooks) |

## Versioning

These documents track the **latest published versions** — `@rytass/wms-module-graphql@0.3.0` and `@rytass/wms-module-{core,react}@0.1.6` as of this writing. Anything in `main` that has not yet been released is marked clearly inline; otherwise assume the documented signature matches the current npm-published library.

`@rytass/wms-module-graphql@0.3.0` introduced **breaking changes** to `WmsModuleGraphqlModule.forRootAsync` (single argument; consumer now registers their own `GraphQLModule.forRootAsync`). The integration guide and API reference reflect the post-0.3.0 surface — see each package's `CHANGELOG.md` for the full breaking change list when upgrading.
