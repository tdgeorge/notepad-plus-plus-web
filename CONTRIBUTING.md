# Contributing

Thanks for contributing to Notepad++ Web.

## Before you start

1. Search existing issues and PRs before opening new ones.
2. Open or link an issue for bug fixes or feature work when possible.
3. Keep each PR focused on one change.

## Development workflow

1. Create a branch from the latest default branch.
2. Make your change in `web/` (unless your change intentionally targets another area).
3. Run checks:

```bash
cd web
npm install
npm run lint
npm run build
```

4. Open a PR with a clear description of what changed and why.

## Pull request guidelines

- Keep changes small and reviewable.
- Avoid unrelated refactors in the same PR.
- Update docs when behavior or workflows change.
- Address review feedback by pushing follow-up commits to the same PR.

## Code style

- Follow existing file and component style in the area you modify.
- Prefer consistency with nearby code over personal formatting preferences.
