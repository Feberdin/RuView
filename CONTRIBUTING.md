# Contributing to the Feberdin RuView Fork

## Fork workflow

Use `origin` for `Feberdin/RuView` and a read-only `upstream` remote for
`ruvnet/RuView`. Never force-push `main` or push to upstream.

```bash
git remote -v
git fetch --all --prune
git switch -c codex/short-purpose origin/main
git log --oneline --left-right origin/main...upstream/main
```

For upstream synchronization, start from the reviewed upstream commit on a
topic branch, reapply the Feberdin security overlay, run all gates, and merge
both histories. Verify both ancestor relationships before updating `main`.

## Assumptions and setup

The common toolchain is macOS or Linux, Node.js 24, Python 3.12, Rust 1.94,
npm, and Git. Component-specific targets such as ESP-IDF and Tauri require the
tools in their own guides.

```bash
git clone git@github.com:Feberdin/RuView.git
cd RuView
(cd ui/mobile && npm ci --ignore-scripts)
(cd dashboard && npm ci --ignore-scripts)
rustup toolchain install 1.94.0 --profile minimal
```

Install only the package being changed. During dependency review, use
`--ignore-scripts`; run required native lifecycle scripts only after reviewing
the dependency diff.

## Red, green, refactor

For code changes, first add the smallest test that demonstrates the missing or
broken behavior and observe the expected functional failure. Implement the
smallest fix, rerun that test, then the directly affected suite. Refactor only
while green. Documentation-only changes use Markdown, link, YAML, and command
validation instead of artificial unit tests.

Typical component checks:

```bash
# Mobile
(cd ui/mobile && npm test -- --runInBand && npm run lint)

# TypeScript package (use the scripts actually present in package.json)
(cd tools/ruview-mcp && npm run typecheck && npm test && npm run build)

# Rust
(cd v2 && cargo test --workspace --no-default-features)
(cd v2 && cargo fmt --all --check)

# Repository security and dependency gates
bash .github/scripts/cargo-audit.sh --file v2/Cargo.lock
gitleaks dir --config .gitleaks.toml --redact --no-banner .
```

Run every applicable command from `SECURITY.md`. Never weaken an assertion,
skip a security job, or add a broad exception to make CI green.

## Documentation and diagnostics

User-facing changes document purpose, minimum setup, configuration names with
placeholders, expected result, common failures, debug/log locations, security,
privacy, permissions, and license implications. External boundaries must fail
early with an error that says what failed, why, and what to check. Debug logs
must mask secrets and sensitive observations.

## Verify the pushed commit

```bash
sha=$(git rev-parse HEAD)
gh run list --commit "$sha" --limit 20 \
  --json databaseId,name,status,conclusion,headSha,url
gh run watch RUN_ID --compact --exit-status
gh run view RUN_ID --log-failed
```

Fix the first real CI error, push the correction, and repeat for the new commit
before starting follow-up work.

## Pull request checklist

- Branch is based on the intended current upstream revision.
- Focused test was functionally red before the code change and green after it.
- Relevant suites, formatting, lint, type checks, builds, and audits are green.
- `git diff --check`, staged-file review, and Gitleaks are clean.
- Documentation explains setup, operation, debugging, and security.
- GitHub Actions for the exact pushed commit is green.

Contributions use the repository's [MIT License](LICENSE).
