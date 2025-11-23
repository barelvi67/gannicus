# Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases.

## How It Works

1. **Adding Changesets**: When you make changes, run `bun changeset` to create a changeset file
2. **Version Bumping**: Changesets automatically determines version bumps based on changeset types
3. **Release PR**: When changesets are merged to `main`, a PR is created with version bumps and changelog updates
4. **Publishing**: When the release PR is merged, packages are automatically published to npm and a GitHub Release is created

## Adding a Changeset

When you make changes that should be released:

```bash
bun changeset
```

This will:
1. Show you which packages have changed
2. Ask you to select the type of change:
   - **major**: Breaking changes
   - **minor**: New features (backwards compatible)
   - **patch**: Bug fixes (backwards compatible)
3. Ask you to write a summary of the change

The changeset file will be created in `.changeset/` directory.

## Release Process

### Automatic (Recommended)

1. Make your changes and add a changeset (`bun changeset`)
2. Open a PR with your changes
3. When merged to `main`, GitHub Actions will:
   - Create a release PR with version bumps and changelog updates
   - When the release PR is merged, publish to npm and create a GitHub Release

### Manual (If Needed)

```bash
# 1. Version packages (updates package.json and CHANGELOG.md)
bun run changeset:version

# 2. Build packages
bun run build

# 3. Publish to npm (requires npm login)
bun run changeset:publish
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

## Changelog

The changelog follows [Keep a Changelog](https://keepachangelog.com/) format and is automatically generated from changesets.

## NPM Publishing

Packages are published to npm automatically when:
- A release PR is merged to `main`
- The `NPM_TOKEN` secret is configured in GitHub repository settings

To configure NPM_TOKEN:
1. Go to repository Settings → Secrets and variables → Actions
2. Add `NPM_TOKEN` with your npm access token
3. Ensure the token has publish permissions for `@gannicus/*` scopes

