# Releasing

This repo ships v2.x of `@djs-commands/*` packages via [Changesets](https://github.com/changesets/changesets) + GitHub Actions, authenticating to npm via [Trusted Publishers](https://docs.npmjs.com/trusted-publishers) (OIDC). No long-lived `NPM_TOKEN` secret is required.

## Day-to-day flow

1. Land a feature PR.
2. As part of the PR (or in a follow-up), run `bun changeset` and pick the bump kind (`patch` / `minor` / `major`) for each affected package. Commit the generated `.changeset/<random>.md`.
3. After the PR merges to `main`, the **Release** workflow opens (or updates) a `chore: release` pull request that:
   - Bumps versions in every affected `package.json`
   - Writes/updates `CHANGELOG.md` for each package
   - Removes the consumed changesets
4. Merging that release PR triggers the workflow again. This time it sees package versions are ahead of npm and runs `bun run release` — `turbo build --filter='@djs-commands/*'` followed by `changeset publish`. The npm CLI auto-detects OIDC and publishes with attached provenance.

## Initial v2.0.0 launch

The first release is bootstrapped:

- All `@djs-commands/*` package.jsons are pinned at `2.0.0`
- A single `v2-launch.md` changeset declares it `major` for every package
- Once that PR merges, the Release workflow opens a version PR which consumes the changeset and prepares CHANGELOGs
- Merging the version PR publishes 2.0.0 to npm

### One-time setup before the first publish

**Trusted Publisher configuration must be done per-package on npm** before the first OIDC-authenticated publish (each package can have only one trusted publisher; there's no org-level setting per [npm docs](https://docs.npmjs.com/trusted-publishers)). Two paths:

#### Path A — manual first publish, then switch to OIDC

1. Locally, log in with `npm login` as a user with publish access to the `@djs-commands` org.
2. Build and publish 2.0.0 from your machine:
   ```bash
   bun install --frozen-lockfile
   bun run build --filter='@djs-commands/*'
   cd packages/core && npm publish --access public --provenance=false && cd -
   # …repeat for jsx, cli, adapter-drizzle, adapter-prisma, adapter-mongoose, adapter-redis
   ```
3. For each newly-published package, configure the trusted publisher on npmjs.com:
   - Go to `https://www.npmjs.com/package/@djs-commands/<name>/access`
   - Under "Trusted publishers", click **Add publisher**
   - Provider: **GitHub Actions**
   - Owner: `D3OXY`
   - Repository: `djs-commands`
   - Workflow filename: `release.yml`
   - Environment: leave blank (we don't gate on a deploy environment)
4. After step 3 is done for all 7 packages, every subsequent release flows through the workflow with no token config needed.

#### Path B — pre-register trusted publishers (if your npm org admin supports unpublished package reservations)

Some org admins can pre-register trusted publishers for unpublished package names. If yours can, configure each `@djs-commands/<name>` ahead of the first publish using the same fields above, then skip Path A's step 1-2 entirely and let the workflow do the first publish via OIDC.

## What the workflow expects

- **Permissions** (declared in `.github/workflows/release.yml`):
  - `contents: write` — for changesets to push the `Version Packages` PR
  - `pull-requests: write` — same
  - `id-token: write` — **required** for OIDC; npm verifies this token against the trusted publisher config
- **No secrets** beyond the built-in `GITHUB_TOKEN`. Specifically:
  - No `NPM_TOKEN` (replaced by Trusted Publishers)
  - No `NPM_CONFIG_PROVENANCE=true` (provenance is automatic with OIDC)

## Manual publish (escape hatch)

If GitHub Actions is unavailable or the workflow needs to be bypassed:

```bash
bun install --frozen-lockfile
bun run build --filter='@djs-commands/*'
bun changeset publish
```

You'll need to be logged in via `npm login` and have publish access. Note that provenance only attaches when published via Trusted Publishers from CI — local publishes succeed but without the attestation.

## v1 sunset

After v2.0.0 publishes successfully, the maintainer also handles the v1 deprecation (these are one-way actions, not automated):

```bash
# Final v1 maintenance release (replaces README with deprecation notice)
git checkout v1-final-commit
git switch -c v1-maintenance
# … edit packages/v1's README.md to point at v2 …
npm version patch       # bumps to 1.4.11 or similar
npm publish --access public

# Mark all v1 versions as deprecated on npm
npm deprecate '@d3oxy/djs-commands@<2' '@d3oxy/djs-commands is unmaintained. Migrate to @djs-commands/core — see https://djscommands.deoxy.dev/migration-from-v1'

# Update the GitHub repo description to mention the new package name
# Open and pin a GitHub issue announcing v2
```

These steps are spelled out in [slice #67](https://github.com/D3OXY/djs-commands/issues/67).
