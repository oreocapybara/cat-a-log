# Contributing to Cat-A-Log

## Development Setup

Follow the [README](./README.md) to get the project running locally.

## Commit Conventions

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `ci`

**Scopes:** `auth`, `shell`, `map`, `tag`, `profile`, `db`, `ci`

**Rules:**

- Subject line is lowercase after the colon, no trailing period
- Keep the subject under 72 characters
- Use the body to explain what and why, not how
- Breaking changes add `!` after the scope: `feat(db)!: rename column`

**Examples:**

```
feat(tag): add photo crop before upload
fix(proxy): handle missing session cookie on first load
docs: update README setup instructions
```

## Code Quality

The project enforces consistent code quality through automated tooling:

```bash
npm run lint          # ESLint — catches bugs and enforces patterns
npm run format        # Prettier — formats all files
npm run format:check  # Check formatting without writing changes
npm run type-check    # TypeScript strict mode — no type errors allowed
```

## Git Hooks

[Husky](https://typicode.github.io/husky/) runs checks automatically:

- **Pre-commit:** `lint-staged` runs ESLint (with --fix) and Prettier on staged `.ts`/`.tsx` files. Other file types (`.js`, `.json`, `.md`, `.css`) get Prettier formatting only.
- **Pre-push:** Runs `type-check → lint → build` in sequence. The push is blocked if any step fails.

You don't need to configure these — they're set up automatically when you run `npm ci`.

## CI Pipeline

GitHub Actions runs on every pull request:

1. Install dependencies (`npm ci`)
2. Check formatting (`npm run format:check`)
3. Lint (`npm run lint`)
4. Type-check (`npm run type-check`)
5. Build (`npm run build`)

All steps must pass for a PR to be mergeable.

## Branching Strategy

This project uses a three-tier branch model: **main ← dev ← feature branches**.

```
main          (production — always deployable)
 └── dev      (integration — accumulates completed features)
      ├── feat/map-clustering
      ├── fix/proxy-session-cookie
      └── chore/upgrade-next
```

### Branch roles

| Branch                                               | Purpose                     | Receives merges from      |
| ---------------------------------------------------- | --------------------------- | ------------------------- |
| `main`                                               | Production-ready code       | `dev` only (via PR)       |
| `dev`                                                | Integration & stabilization | Feature branches (via PR) |
| `feat/*`, `fix/*`, `chore/*`, `refactor/*`, `docs/*` | Individual units of work    | —                         |

### Rules

1. **Never push directly to `main` or `dev`.** All changes arrive via pull request.
2. Create feature branches from `dev` and PR them back into `dev`.
3. Promote `dev` to `main` via a "Release: dev → main" PR when ready for production.
4. Branch names use a type prefix matching commit conventions: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`.
5. Keep PRs focused on a single change.
6. Make sure CI passes before requesting review.

### Typical workflow

```bash
# Start new work
git checkout dev
git pull
git checkout -b feat/my-feature

# ... make changes, commit ...

# Push — a PR to dev is auto-created by GitHub Actions
git push -u origin feat/my-feature
```

### Automation

- **Push a feature branch** → GitHub Actions auto-creates a PR targeting `dev`.
- **dev is updated** → GitHub Actions auto-creates/updates a "Release: dev → main" PR.

You don't need to manually create PRs in most cases — just push your branch.
