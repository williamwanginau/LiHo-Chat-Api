# Repository Guidelines

## Project Structure & Module Organization
- Place application/library code in `src/` and group by domain (not by type).
- Keep tests in `tests/`, mirroring `src/` paths (e.g., `src/pkg/module.py` → `tests/pkg/test_module.py`).
- Store helper scripts in `scripts/`, static files in `assets/`, and CI/templates in `.github/`.
- Keep modules small and cohesive; avoid cross‑layer imports (UI → service → data).

## Build, Test, and Development Commands
- Dev server/run: `make dev` if available; otherwise run the appropriate entry point under `src/`.
- Build: `make build` or the language tool (e.g., `npm run build`, `python -m build`).
- Test: `make test`, or `pytest -q` (Python) / `npm test` or `vitest` (Node/TS).
- Lint/format: `make lint`; otherwise `ruff .`/`black .` (Py) or `eslint .`/`prettier -w .` (JS/TS).

## Coding Style & Naming Conventions
- Indentation: 4 spaces (Python), 2 spaces (JS/TS). Line length: 100.
- Files: `snake_case.py` (Python), `kebab-case.ts` (scripts/CLI). Classes: `PascalCase`. Functions/vars: `snake_case` (Py), `camelCase` (JS/TS).
- Prefer pure functions and dependency injection. Avoid side effects at import time.
- Use a formatter (Black/Prettier) and run linters locally before pushing.

## Testing Guidelines
- Use unit tests for logic and focused integration tests for boundaries (I/O, DB, HTTP).
- Naming: `tests/test_*.py` (Py) or `**/*.test.ts` (TS). Keep one assertion topic per test.
- Coverage: target ≥ 85%. Examples: `coverage run -m pytest && coverage report` or `vitest --coverage`/`jest --coverage`.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`, `chore:`.
- Write imperative, scoped messages; reference issues (e.g., `Fixes #123`).
- PRs include: clear description, motivation, before/after notes, screenshots/logs for UX/CLI changes, and a checklist (tests updated, docs updated, breaking changes called out).

## Security & Configuration
- Do not commit secrets. Use `.env` locally and provide `.env.example` with safe defaults.
- Validate external inputs and fail closed. Pin critical dependencies and review licenses.

## Agent‑Specific Tips
- Prefer idempotent `make` targets and deterministic commands.
- Keep changes small and scoped; update docs and tests alongside code.
