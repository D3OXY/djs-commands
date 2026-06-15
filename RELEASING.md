# Releasing

This repo ships v3.x of `@djs-commands/*` packages via [Changesets](https://github.com/changesets/changesets) + GitHub Actions, authenticating to npm via [Trusted Publishers](https://docs.npmjs.com/trusted-publishers) (OIDC). No long-lived `NPM_TOKEN` secret is required.

## Day-to-day flow

1. Land a feature PR.
2. As part of the PR (or in a follow-up), run `bun changeset` and pick the bump kind (`patch` / `minor` / `major`) for each affected package. Commit the generated `.changeset/<random>.md`.
3. After the PR merges to `main`, the **Release** workflow opens (or updates) a `chore: release` pull request that:
   - Bumps versions in every affected `package.json`
   - Writes/updates `CHANGELOG.md` for each package
   - Removes the consumed changesets
4. Merging that release PR triggers the workflow again. This time it sees package versions are ahead of npm and runs `bun run release` — `turbo build --filter='@djs-commands/*'` followed by `changeset publish`. The npm CLI auto-detects OIDC and publishes with attached provenance.

## Initial v2.0.0 launch

The first release is bootstrapped without changesets — all 7 publishable `package.json` files are pinned at `2.0.0` and `CHANGELOG.md` files are pre-seeded with the launch entry. Changesets only manages versions from `2.0.1` onward.

The first publish must be manual (Path A below) because **Trusted Publishers can only be configured for packages that already exist on npm**. After the first manual publish, configure the trusted publishers, and every subsequent release flows through the workflow.

### One-time setup before the first publish

**Trusted Publisher configuration must be done per-package on npm** before the first OIDC-authenticated publish (each package can have only one trusted publisher; there's no org-level setting per [npm docs](https://docs.npmjs.com/trusted-publishers)). Two paths:

#### Path A — manual first publish, then switch to OIDC

1. Verify access: `npm whoami` and `npm org ls @djs-commands`. Run `npm login` if needed.
2. Build all 7 packages:
   ```bash
   bun install --frozen-lockfile
   bun run build --filter='@djs-commands/*'
   ```
3. Publish all 7 from the repo root in one shot — `changeset publish` is idempotent and resolves dependency order automatically:
   ```bash
   bun changeset publish
   ```
   This walks the `@djs-commands/*` packages and publishes each one whose `package.json` version is ahead of npm. You'll be prompted for your 2FA OTP per package (or once with `--otp=<code>`). These manual publishes will NOT have provenance — that comes from CI only.
4. For each newly-published package, configure the trusted publisher on npmjs.com:
   - Go to `https://www.npmjs.com/package/@djs-commands/<name>/access`
   - Under "Trusted publishers", click **Add publisher**
   - Provider: **GitHub Actions**
   - Owner: `D3OXY`
   - Repository: `djs-commands`
   - Workflow filename: `release.yml`
   - Environment: leave blank (we don't gate on a deploy environment)
5. After step 4 is done for all 7 packages, every subsequent release flows through the workflow with provenance attestation attached.

#### Path B — pre-register trusted publishers (if your npm org admin supports unpublished package reservations)

Some org admins can pre-register trusted publishers for unpublished package names. If yours can, configure each `@djs-commands/<name>` ahead of the first publish using the same fields above, then let the workflow do the first publish via OIDC by pushing an empty commit to main.

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

After the current major publishes successfully, the maintainer also handles the v1 deprecation (these are one-way actions, not automated):

```bash
# Final v1 maintenance release (replaces README with deprecation notice)
git checkout v1-final-commit
git switch -c v1-maintenance
# … edit packages/v1's README.md to point at v3 …
npm version patch       # bumps to 1.4.11 or similar
npm publish --access public

# Mark all v1 versions as deprecated on npm
npm deprecate '@d3oxy/djs-commands@<2' '@d3oxy/djs-commands is unmaintained. Migrate to @djs-commands/core — see https://djscommands.deoxy.dev/migration-from-v1'

# Update the GitHub repo description to mention the new package name
# Open and pin a GitHub issue announcing the current major
```

These steps are spelled out in [slice #67](https://github.com/D3OXY/djs-commands/issues/67).
