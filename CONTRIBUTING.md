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

## Branch Workflow

- Don't push directly to `main` — create a branch and open a pull request
- Keep PRs focused on a single change
- Make sure CI passes before requesting review
