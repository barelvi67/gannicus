# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## Adding a changeset

When you make changes that should be released, run:

```bash
bun changeset
```

This will prompt you to:
1. Select which packages should be bumped
2. Select the type of change (major, minor, patch)
3. Write a summary of the change

## Releasing

Releases are handled automatically by GitHub Actions when changesets are merged to `main`.

The release process:
1. Creates a PR with version bumps and changelog updates
2. When merged, publishes to npm and creates a GitHub Release
3. Uses semantic versioning (semver)

## Manual release (if needed)

```bash
# Version packages
bun changeset version

# Build packages
bun run build

# Publish to npm (requires npm auth)
bun changeset publish
```

