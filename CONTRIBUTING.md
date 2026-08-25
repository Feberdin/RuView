# Contributing to the Feberdin RuView Fork

## Purpose

This guide keeps changes reviewable by non-specialists while preserving the
fork relationship with `ruvnet/RuView`. It covers branch flow, setup, tests,
security, diagnostics, and upstream synchronization.

## Repository and branch flow

Use `origin` for `Feberdin/RuView` and a read-only `upstream` remote for the
original project:

```bash
git remote -v
git remote add upstream https://github.com/ruvnet/RuView.git  # only if missing
git remote set-url --push upstream DISABLED
git fetch --all --prune
git switch -c codex/short-purpose origin/main
```

Keep Feberdin hardening commits on the fork. To incorporate upstream changes,
fetch first, inspect the divergence, and merge a reviewed upstream commit into a
topic branch. Do not force-push `main`, detach the fork, or push directly to
`upstream`.

```bash
git fetch upstream
git log --oneline --left-right origin/main...upstream/main
git switch -c codex/sync-upstream origin/main
git merge --no-ff upstream/main
```

Resolve conflicts package by package and rerun every gate below. Security
overrides must be re-evaluated, not silently discarded, when upstream changes a
lockfile.

## Development setup

Assumptions: macOS or Linux, Node.js 24, Python 3.12, Rust 1.94, npm, and Git.
Optional platform-specific targets such as ESP-IDF, Tauri, and Docker require the
tools documented in their component guides.

```bash
git clone git@github.com:Feberdin/RuView.git
cd RuView

# Install only the package you intend to change.
(cd ui/mobile && npm ci --ignore-scripts)
(cd dashboard && npm ci --ignore-scripts)

python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

rustup toolchain install 1.94.0 --profile default
```

Do not run untrusted npm lifecycle scripts during dependency review. Native
builds that genuinely require them should be run only after the dependency diff
has been inspected.

## Change and test workflow

For code changes, first add the smallest test that demonstrates the missing or
broken behavior and run it to observe the expected failure. Implement the
smallest fix, rerun that test, then execute the directly affected suite. Pure
documentation changes use YAML, Markdown, and link validation instead of an
artificial unit test.

Common checks:

```bash
# Mobile
cd ui/mobile
npm test -- --runInBand path/to/focused.test.ts
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run test:dependency-security
npx expo-doctor

# TypeScript packages
cd tools/ruview-mcp  # or tools/ruview-cli, examples/frontend, dashboard
npm run typecheck    # where available
npm run lint         # where available
npm test
npm run build

# Rust workspace
cd v2
cargo test --workspace --no-default-features
cargo fmt --all --check
cargo clippy --workspace --all-targets --no-default-features -- -D warnings
cargo audit --deny warnings

# PyO3 package
cd python
maturin develop --features pyo3/extension-module
pytest
ruff check .
mypy wifi_densepose tests
cargo audit --deny warnings
```

Run `npm audit --audit-level=low` in every changed npm package and the Python,
Rust, and Gitleaks commands from [`SECURITY.md`](SECURITY.md). Never weaken a
test, skip a security job, or add a scanner exception merely to make CI green.

## Documentation and usability

Every user-facing change must update the relevant README or guide with:

- purpose and expected result;
- minimum installation and start commands;
- configuration names with placeholder values;
- common failure messages and corrective actions;
- log location and how to enable debug output;
- security, privacy, permission, and license implications.

Code should fail early at external boundaries and explain what failed, why it
failed, and what the operator should check. Debug logs must mask credentials and
private data.

## Pull request checklist

- The branch is based on current `origin/main`; upstream changes are identified.
- A focused regression test failed for the expected reason before the fix.
- Focused, component, and relevant full suites are green after the fix.
- Formatter, linter, type checker, build, and dependency audits were run where
  applicable.
- `git diff --check`, staged-file review, and Gitleaks are clean.
- Documentation explains setup, operation, debugging, and security implications.
- The exact pushed commit's GitHub Actions runs are green before follow-up work.

## Debugging failed CI

Find the run for the exact commit rather than relying on the newest run:

```bash
git rev-parse HEAD
gh run list --commit "$(git rev-parse HEAD)" --limit 20 \
  --json databaseId,name,status,conclusion,headSha,url
gh run watch RUN_ID --compact --exit-status
gh run view RUN_ID --log-failed
```

Start with the first real error in the failed job. Reproduce its exact command
locally, fix the cause, push the new commit, and wait for CI again. Never include
tokens, cookies, or unredacted production logs in a bug report.

## License

Contributions are provided under the repository's [MIT License](LICENSE).
