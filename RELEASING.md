# Releasing

This repo ships v2.x of `@djs-commands/*` packages via [Changesets](https://github.com/changesets/changesets) + GitHub Actions.

## Day-to-day flow

1. Land a feature PR.
2. As part of the PR (or in a follow-up), run `bun changeset` and pick the bump kind (`patch` / `minor` / `major`) for each affected package. Commit the generated `.changeset/<random>.md`.
3. After the PR merges to `main`, the **Release** workflow opens (or updates) a `chore: release` pull request that:
   - Bumps versions in every affected `package.json`
   - Writes/updates `CHANGELOG.md` for each package
   - Removes the consumed changesets
4. Merging that release PR triggers the workflow again. This time it sees package versions are ahead of npm and runs `bun run release` — `turbo build` followed by `changeset publish` with `NPM_CONFIG_PROVENANCE=true` for SLSA attestation.

## Initial v2.0.0 launch

The first release is bootstrapped:

- All `@djs-commands/*` package.jsons are pinned at `2.0.0` in this branch
- A single `v2-launch.md` changeset declares it `major` for every package
- Once this PR merges, the Release workflow opens the version PR which consumes that changeset and prepares CHANGELOGs
- Merging the version PR publishes 2.0.0 to npm

### One-time setup before the first publish

The maintainer needs to configure two repository secrets:

| Secret | Description |
|---|---|
| `NPM_TOKEN` | An npm "Automation" token with publish access to the `@djs-commands` org. Generate at <https://www.npmjs.com/settings/~/tokens>. |
| (built-in) `GITHUB_TOKEN` | Provided by Actions. The release job needs `contents: write`, `pull-requests: write`, `id-token: write` — already declared in `.github/workflows/release.yml`. |

For provenance to work, the npm package owners must have 2FA enabled and the npm org must allow OIDC publishing from GitHub Actions (default for new orgs).

## Manual publish (escape hatch)

If GitHub Actions is unavailable or the workflow needs to be bypassed:

```bash
bun install --frozen-lockfile
bun run build --filter='@djs-commands/*'
NPM_CONFIG_PROVENANCE=true bun changeset publish
```

You'll need to be logged in via `npm login` and have publish access to `@djs-commands`. Note that provenance only attaches when run from CI with OIDC — local publishes will succeed but without the attestation.

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
