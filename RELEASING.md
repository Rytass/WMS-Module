# Releasing `@rytass/wms-module-*` packages

This monorepo publishes the WMS libraries to npm using [Nx Release](https://nx.dev/docs/features/manage-releases). The two libraries are released independently — each has its own semver line, git tag and CHANGELOG.

| Package | Source | npm |
|--------|--------|-----|
| `@rytass/wms-module-core` | `libs/core` | https://www.npmjs.com/package/@rytass/wms-module-core |
| `@rytass/wms-module-graphql` | `libs/graphql` | https://www.npmjs.com/package/@rytass/wms-module-graphql |

## How the pipeline works

1. **Local**: a maintainer runs `yarn release` from a clean `main` checkout. Nx Release reads conventional commits, bumps versions, writes per-project `CHANGELOG.md`, updates inter-package `peerDependencies`, creates per-project git tags (`core@x.y.z`, `graphql@x.y.z`), and pushes everything to GitHub.
2. **CI**: pushing the tags triggers `.github/workflows/publish.yml`, which builds the libs and runs `nx release publish` to push the tarballs to npm (with provenance attestation).

Versioning is **conventional-commits driven** — `feat:` commits bump minor, `fix:` bumps patch, footers containing `BREAKING CHANGE` bump major. Commit scopes determine which package picks up the change: `feat(core): ...` only bumps `core`, `fix(graphql): ...` only bumps `graphql`. Use scope `repo`/`ci`/`docs` for commits that should not trigger any release.

## One-time setup

1. **npm scope**: ensure the `@rytass` org on npmjs.com has the publishing user as a maintainer with **automation token** permissions.
2. **GitHub secret**: add `NPM_TOKEN` to repository secrets (Settings → Secrets and variables → Actions). The token must be an automation token (not a personal token) so it survives 2FA prompts.
3. **Self-hosted runner**: the `publish.yml` workflow uses `runs-on: self-hosted`, matching the existing `staging.yml` runner pool. No additional runner configuration is required.

## Local release flow

```bash
git checkout main
git pull --ff-only

# First release ever: add --first-release the first time only
yarn release --first-release --dry-run
yarn release --first-release            # commits, tags, pushes

# Subsequent releases
yarn release --dry-run                  # preview
yarn release                            # for real
```

`yarn release` is wired in `package.json` as `nx release --skip-publish`. It pushes commits and tags to the configured remote; the publish workflow takes it from there. If you ever need to manually re-publish a tagged version (for example, after fixing a CI outage), run `yarn release:publish` against the same checkout.

## What happens on tag push

`.github/workflows/publish.yml` triggers on tags matching `core@*`, `graphql@*`, or `react@*`. The job:

1. Checks out the tagged commit with full history.
2. Installs Node 20, enables Corepack (yarn 4.12.0), runs `yarn install --immutable`.
3. Runs `yarn nx run-many -t build --projects=core,graphql` to produce the dual-format (`index.cjs.js` bundled CJS + per-file ESM + `index.d.ts`) artefacts inside each lib directory.
4. Runs `yarn nx release publish`, which executes `npm publish` with `NPM_CONFIG_PROVENANCE=true` for supply-chain attestation; authentication uses `NODE_AUTH_TOKEN` from the `NPM_TOKEN` secret.

## Conventional commit scopes used in this repo

| Scope | Effect |
|-------|--------|
| `feat(core)`, `fix(core)` | Bumps `@rytass/wms-module-core` |
| `feat(graphql)`, `fix(graphql)` | Bumps `@rytass/wms-module-graphql` |
| `feat(react)`, `fix(react)` | Bumps `@rytass/wms-module-react` (once the React lib is split out) |
| `feat(api)`, `feat(client)` | Application changes; no library release triggered |
| `chore(*)`, `ci(*)`, `docs(*)`, `style(*)` | No release |

Cross-package consequences are handled automatically via `version.updateDependents: "auto"` — when `core` bumps, `graphql`'s `peerDependencies` entry for `@rytass/wms-module-core` is rewritten in the same release commit, so downstream consumers always see consistent version ranges.

## Troubleshooting

- **`publish.yml` fails with `403 Forbidden`**: the `NPM_TOKEN` is missing, expired, or lacks publish scope on `@rytass`. Regenerate the automation token on npmjs.com and update the GitHub secret.
- **Nx says "Unable to resolve current version from git tags"**: a project has never been released; pass `--first-release` once.
- **GitHub Release creation fails**: the workflow needs `GITHUB_TOKEN` write access. The default token has it, but if you tightened repo permissions, ensure "Read and write permissions" is enabled under Settings → Actions → General → Workflow permissions.
- **A release is missing changes you expected**: check that the relevant commits used the right scope (`feat(core)` vs `feat(api)`). Nx Release only picks up commits matching the project scope (or no scope at all).
