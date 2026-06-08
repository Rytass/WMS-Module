# Releasing `@rytass/wms-module-*` packages

This monorepo publishes the WMS libraries to npm using [Nx Release](https://nx.dev/docs/features/manage-releases). The two libraries are released independently — each has its own semver line, git tag and CHANGELOG.

| Package | Source | npm |
|--------|--------|-----|
| `@rytass/wms-module-core` | `libs/core` | https://www.npmjs.com/package/@rytass/wms-module-core |
| `@rytass/wms-module-graphql` | `libs/graphql` | https://www.npmjs.com/package/@rytass/wms-module-graphql |

## How the pipeline works

Publishing is **fully manual** since PR #177 — the previous CI workflow (`.github/workflows/publish.yml`) was removed because it kept producing inconsistent provenance attestations on the self-hosted runner. The maintainer now runs both phases locally from a clean `main` checkout:

1. **Bump + tag + push** — `yarn release` reads conventional commits, bumps versions, writes per-project `CHANGELOG.md`, updates inter-package `peerDependencies`, creates per-project git tags (`core@x.y.z`, `graphql@x.y.z`, `react@x.y.z`), commits, and pushes the commit + tags to GitHub.
2. **Publish** — `yarn nx release publish --otp=XXXXXX` builds the libs, runs `npm publish` against each tagged tarball, and (if configured) emits provenance. Because the maintainer's npm account is 2FA-protected, you must pass the current 6-digit OTP — without `--otp`, npm will reject the publish.

Versioning is **conventional-commits driven** — `feat:` commits bump minor, `fix:` bumps patch, footers containing `BREAKING CHANGE` bump major. Commit scopes determine which package picks up the change: `feat(core): ...` only bumps `core`, `fix(graphql): ...` only bumps `graphql`. Use scope `repo`/`ci`/`docs` for commits that should not trigger any release.

> Per-project semver: in `0.x.y` we treat minor bumps as the breaking-change channel (consistent with SemVer's 0.x rule). The `0.3.0` graphql release was a breaking API surface change but did not bump to `1.0.0` because pre-1.0 lib consumers expect that contract.

## One-time setup

1. **npm scope**: ensure the `@rytass` org on npmjs.com has the publishing user as a maintainer with publish rights.
2. **Local npm login**: `npm login --scope=@rytass --registry=https://registry.npmjs.org/` once, so subsequent publishes only need an OTP, not a full credential round-trip.
3. **GPG signing**: commits are signed (`commit.gpgsign=true` in `~/.gitconfig`). Make sure your `gpg-agent` is unlocked **before** running `yarn release`, otherwise the underlying `git commit` will time out on the pinentry prompt. The release artefacts are then orphaned on disk — `git reset --hard HEAD` to discard, unlock GPG, and rerun `yarn release`.

## Local release flow

```bash
git checkout main
git pull --ff-only

# Preview first
yarn release --dry-run

# Real bump + commit + push tags
yarn release

# Publish — substitute the current 6-digit npm OTP
yarn nx release publish --otp=XXXXXX
```

`yarn release` is wired in `package.json` as `nx release --skip-publish`. It pushes the version-bump commit and tags; **it does not publish**. The publish step (`yarn nx release publish`) is a separate command and always requires the live `--otp=` value because the publishing account has 2FA enabled.

## First-time release

If a lib has never been published, pass `--first-release` to the bump step on its first cycle:

```bash
yarn release --first-release --dry-run
yarn release --first-release
yarn nx release publish --otp=XXXXXX
```

## Verifying a publish

```bash
curl -s https://registry.npmjs.org/@rytass/wms-module-graphql \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['dist-tags']['latest'])"
```

`npm view <pkg> version` caches aggressively (~5 min) so prefer hitting the registry JSON directly when verifying a fresh publish.

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

- **`npm publish` fails with `EOTP`**: the `--otp=` value expired (TOTPs rotate every 30 s). Refresh the authenticator app and rerun `yarn nx release publish --otp=NEW`.
- **`npm publish` fails with `E403 Forbidden`**: the local npm login does not have publish rights on the `@rytass` scope. Run `npm whoami` to verify the account, then ask an owner to add you as a maintainer on npmjs.com.
- **`yarn release` fails with `gpg: signing failed: 逾時`**: `gpg-agent` is locked. Unlock with `echo test | gpg --clearsign` (enter passphrase when pinentry pops), then `git reset --hard HEAD` to drop the half-written bump files, and rerun `yarn release`.
- **Nx says "Unable to resolve current version from git tags"**: a project has never been released; pass `--first-release` once.
- **GitHub Release creation fails**: `yarn release` calls the GitHub Releases API using your local `gh` auth — ensure `gh auth status` is green before retrying.
- **A release is missing changes you expected**: check that the relevant commits used the right scope (`feat(core)` vs `feat(api)`). Nx Release only picks up commits matching the project scope (or no scope at all). Commits whose scope is `repo`/`ci`/`docs` deliberately do not trigger a bump.
