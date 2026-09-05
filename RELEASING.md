# Releasing `@rytass/wms-module-*` packages

This monorepo publishes the WMS libraries to npm using [Nx Release](https://nx.dev/docs/features/manage-releases). The three libraries are released independently — each has its own semver line, git tag and CHANGELOG.

| Package | Source | npm |
|--------|--------|-----|
| `@rytass/wms-module-core` | `libs/core` | https://www.npmjs.com/package/@rytass/wms-module-core |
| `@rytass/wms-module-graphql` | `libs/graphql` | https://www.npmjs.com/package/@rytass/wms-module-graphql |
| `@rytass/wms-module-react` | `libs/react` | https://www.npmjs.com/package/@rytass/wms-module-react |

## How the pipeline works

Publishing is **fully manual** since PR #177 — the previous CI workflow (`.github/workflows/publish.yml`) was removed because it kept producing inconsistent provenance attestations on the self-hosted runner. The maintainer now runs both phases locally from a clean `main` checkout:

1. **Bump + tag + push** — `yarn release` reads conventional commits, bumps versions, writes per-project `CHANGELOG.md`, updates inter-package `peerDependencies`, creates per-project git tags (`core@x.y.z`, `graphql@x.y.z`, `react@x.y.z`), commits, and pushes the commit + tags to GitHub.
2. **Publish** — `yarn nx release publish --otp=XXXXXX` builds the libs, runs `npm publish` against each tagged tarball, and (if configured) emits provenance. Because the maintainer's npm account is 2FA-protected, you must pass the current 6-digit OTP — without `--otp`, npm will reject the publish.

Versioning is **conventional-commits driven** — `feat:` commits bump minor, `fix:` bumps patch, footers containing `BREAKING CHANGE` bump major.

**A project picks up a commit because of the files it touched, not because of the scope.**
Nx runs the commit through `filterAffected`, so any commit touching `libs/core/**` is relevant
to `core` whatever its scope says. The scope only decides *how much* it counts:

- scope **is** the project name (`feat(core):`) → the commit's type decides the bump
- scope is anything else (`docs:`, `chore(deps):`, `feat(graphql):` on a commit that also
  edits `libs/core`) → the bump is forced to **patch**, whatever the type

Two consequences worth internalising:

- There is no such thing as a scope that suppresses a release. A `docs:` commit touching
  `libs/react/**` bumps react a patch. To avoid a release, don't touch a published project's
  files.
- Splitting a change across projects loses signal. `feat(graphql):` that also edits
  `libs/core/src/**` scores `core` a *patch*, not a minor — even if it changed core's public
  API. Either keep a commit inside one project, or use a comma scope: `feat(core,graphql):`.

Changelogs are attributed the same way (by file path, with no scope filter), so a
cross-touching commit appears in **both** projects' changelogs. `yarn release --dry-run`
shows the rendered changelogs before anything is written — read them.

### Put `BREAKING CHANGE:` last

The changelog renderer takes everything from `BREAKING CHANGE:` to the end of the commit
message as that entry's body — including any git trailers that follow it. Put the footer
after `Co-Authored-By:` and friends, or they end up printed in the published notes:

```
fix(core)!: compare consumption quantities in base units

<body>

Co-Authored-By: …

BREAKING CHANGE: `ConsumptionOrderItemProgress` now reports base units.
```

Two more things the renderer will not do for you:

- It strips the `BREAKING CHANGE:` prefix, so the sentence after it has to stand on its own —
  start it with a capital, not with "existing rows take…".
- `!` in the subject and a `BREAKING CHANGE:` footer both force a major bump, and the footer's
  *text* is not read. A footer saying "none intended" still bumps major and still prints under
  **Breaking Changes**, which is worse than saying nothing. If a change is not breaking, use
  neither.

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

## The pre-publish gate

`yarn release` runs `nx run-many -t prepublish-check` first (`nx.json`
`release.version.preVersionCommand`). Each project's `prepublish-check` depends on
`typecheck`, `lint`, `build`, `pkg-quality` (publint) and `pkg-quality-attw`
([`@arethetypeswrong/cli`](https://github.com/arethetypeswrong/arethetypeswrong.github.io)).

**publint alone cannot fail the gate** — it exits 0 on warnings. `pkg-quality-attw` is the
one that returns non-zero, which is why it is in `dependsOn`.

### Known attw exemptions — a shrinking list, not a permanent one

Three real packaging defects are currently waived per project via `--ignore-rules`, so the
gate is green and fails on anything *new*. Each waiver is a bug, not a decision:

| Project | Waived rule | Why it fires | Fix |
|---|---|---|---|
| `core`, `graphql` | `unexpected-module-syntax` | Neither declares `"type"`, so npm treats their `.js` as CJS while the ESM build emits ESM syntax into `.js` | Emit ESM as `.mjs` and set `"type": "commonjs"` |
| `react` | `cjs-resolves-to-esm` | Deliberate — the package is ESM-only (see `libs/react/README.md` "Known issues") | Not a bug; keep waived |

Delete a row from this table and its `--ignore-rules` entry in the same commit that fixes it.
(`react`'s `internal-resolution-error` was retired that way — the emitted declarations now
carry explicit specifiers, written by `libs/react/scripts/fix-dts-specifiers.mjs` at the end
of the build.)

## Conventional commit scopes used in this repo

| Scope | Effect |
|-------|--------|
| `feat(core)`, `fix(core)` | Bumps `@rytass/wms-module-core` |
| `feat(graphql)`, `fix(graphql)` | Bumps `@rytass/wms-module-graphql` |
| `feat(react)`, `fix(react)` | Bumps `@rytass/wms-module-react` |
| `feat(api)`, `feat(client)` | No library release **provided the commit stays inside `apps/`** |
| `chore(*)`, `ci(*)`, `docs(*)`, `style(*)` | No release **only if the commit touches no `libs/*` file**; otherwise a forced patch on every project it touches |

Cross-package consequences are handled automatically via `version.updateDependents: "auto"` — when `core` bumps, `graphql`'s `peerDependencies` entry for `@rytass/wms-module-core` is rewritten in the same release commit, so downstream consumers always see consistent version ranges.

## Troubleshooting

- **`npm publish` fails with `EOTP` and the OTP started with `0`**: it did not expire — Nx ate
  the leading zero. `nx release publish` declares `otp` as `type: 'number'`
  (`nx/src/command-line/release/command-object.js`), so yargs coerces `012506` to `12506`.
  You can see it in Nx's own echo: `With additional flags: --otp=12506`. Roughly one OTP in
  ten is affected. Either wait for a code that does not start with `0`, or bypass the flag
  entirely and let npm read it from the environment:

  ```bash
  NPM_CONFIG_OTP=012506 yarn release:publish   # note: no --otp flag
  ```

  This works because the `@nx/js` publish executor shells out to `npm publish` with
  `env: processEnv(true)`, so npm picks up `npm_config_otp` itself.
- **`npm publish` fails with `EOTP` otherwise**: the `--otp=` value expired (TOTPs rotate every 30 s). Refresh the authenticator app and rerun `yarn nx release publish --otp=NEW`.
- **`npm publish` fails with `E403 Forbidden`**: the local npm login does not have publish rights on the `@rytass` scope. Run `npm whoami` to verify the account, then ask an owner to add you as a maintainer on npmjs.com.
- **`yarn release` fails with `gpg: signing failed: 逾時`**: `gpg-agent` is locked. Unlock with `echo test | gpg --clearsign` (enter passphrase when pinentry pops), then `git reset --hard HEAD` to drop the half-written bump files, and rerun `yarn release`.
- **Nx says "Unable to resolve current version from git tags"**: a project has never been released; pass `--first-release` once.
- **GitHub Release creation fails**: `yarn release` calls the GitHub Releases API using your local `gh` auth — ensure `gh auth status` is green before retrying.
- **A release is missing changes you expected**: selection is by changed files, so the commit almost certainly *was* picked up — just as a forced patch, because its scope was not the project's name. Check with `npx nx show projects --affected --base=<sha>^ --head=<sha>`.
- **A package bumped when you expected nothing**: same rule from the other side. Something in that commit touched the project's files. `docs:` and `chore:` do not suppress a release.
