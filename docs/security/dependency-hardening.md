# Feberdin Fork Synchronization and Security Baseline

## Purpose

This record explains how `Feberdin/RuView` was synchronized with current
upstream on 26 August 2026, which findings were remediated, which narrowly
reviewed maintenance boundaries remain, and how recurrence is blocked. It
contains identifiers and package names, never credential values.

## Synchronization evidence

The previous Feberdin tip was
`bb0a05f3dbb38b051a351856e9e58a3d31354e6f`. Freshly fetched upstream was
`d42c5581f34fe8e50b053971d387fb8c56a3baf4` (`ruvnet/RuView` v2390). The fork
had 32 Feberdin-only and 370 upstream-only commits. The corrected branch starts
from that exact upstream commit, reapplies the security overlay, and then joins
both histories with a normal merge commit. No force-push or fork detachment is
required.

Before release, both commands must succeed:

```bash
git merge-base --is-ancestor upstream/main HEAD
git merge-base --is-ancestor codex/pre-upstream-sync-20260826 HEAD
```

## Findings and remediation

### JavaScript

The nine tracked npm lockfiles initially contained 65 audit findings: 3
critical, 37 high, 21 moderate, and 4 low. Compatible direct dependencies,
framework releases, and reviewed transitive overrides were updated. Each
package now installs from its committed lockfile with lifecycle scripts disabled
and returns zero findings at `--audit-level=low`. Mobile tests were adapted to
the supported Expo 55 / React Native 0.83 test environment without weakening
assertions.

### Python

The Aether Arena requirement set initially reported 47 known vulnerabilities,
primarily through the old Gradio, Pillow, and Starlette graph. Gradio was moved
from 5.9.1 to 6.26.0 and the application import plus its chain-verification
smoke path were exercised on Python 3.12. Both tracked Python requirement sets
now return zero findings with `pip-audit==2.10.0 --strict`.

### Rust

All six first-party Cargo lockfiles are scanned. The initial state included
known vulnerabilities in the Python binding, Wasm edge, and standalone RuVector
compatibility graphs, plus unsound `lru`, `rand`, `anyhow`, and GLib paths.
Lockfiles and compatible dependencies were updated. The Python binding uses
PyO3 0.29, and both the main workspace and standalone binding use the reviewed
`midstreamer-temporal-compare` overlay selecting `lru` 0.18.2.

GitHub indexed five additional Rust findings after the synchronized tree was
first pushed: `jsonwebtoken` below 10.3.0 (two manifests plus the lockfile),
`serde_with` below 3.21.0, and `tar` through 0.4.45. The lockfile now resolves
`jsonwebtoken` 10.4.0 with its explicitly selected `aws_lc_rs` provider,
`serde_with` 3.21.0, and `tar` 0.4.46. The alternative `rust_crypto` provider
was rejected because its RSA 0.9 dependency has RUSTSEC-2023-0071 with no fixed
release. All 25 verifier-matrix tests and all 62 sensing-server bearer-auth
tests pass with the selected provider. No new audit exception was introduced.

Tauri's supported GTK3 stack still requires GLib 0.18.5. The exact crates.io
source is vendored with the upstream `VariantStrIter` undefined-behaviour fix;
license, source provenance, delta, and removal criteria are in
`v2/vendor/glib-0.18.5/FEBERDIN-PATCH.md`.

The gate rejects vulnerabilities, unsoundness, and every unexpected RustSec
warning. It accepts only these maintenance-only groups:

| Dependency path | Advisory IDs | Removal condition |
| --- | --- | --- |
| Tauri/Wry → GTK3 | RUSTSEC-2024-0370 and RUSTSEC-2024-0411 through -0420 | Move when Tauri supports a maintained Linux GUI stack and desktop builds pass on all targets. |
| Tauri → `urlpattern` → UNIC | RUSTSEC-2025-0075, -0080, -0081, -0098, -0100 | Remove when the supported parser graph no longer uses UNIC 0.9. |
| Geometry → `atomic-polyfill` | RUSTSEC-2023-0089 | Upgrade the compatible geo/rstar graph under focused geometry tests. |
| Numerical/RuVector graphs | RUSTSEC-2024-0436, RUSTSEC-2025-0057, RUSTSEC-2025-0141, RUSTSEC-2026-0173 | Remove each ID when its transitive upstream replaces the unmaintained crate and compatibility tests pass. |
| CLI progress graph | RUSTSEC-2025-0119 | Remove after an `indicatif` upgrade and progress-output verification. |

`spin` 0.9.8 is pinned by the maintained `flume` 0.11 and 0.12 graphs and has
been yanked without a RustSec vulnerability or a selectable replacement in the
accepted 0.9 range. Yank status is therefore not treated as a vulnerability in
the RustSec command; this exact boundary must be removed when `flume` selects a
non-yanked release. Dependabot and all RustSec advisory classes remain active.

Tracked `audit.toml` files are forbidden. This prevents a nested package from
silently hiding a vulnerability outside the centrally reviewed script.

### Secrets

The fresh upstream worktree produced 13 source findings. All were synthetic
documentation or test values: API examples, WebSocket handshake fixtures, and
JWT-shaped negative-test data. No active credential was established. They were
replaced by environment-variable instructions or runtime-built fixtures, and
the current-tree scan returns zero findings.

Submodule contents are independently versioned repositories. A recursive local
checkout is excluded only at the exact root gitlink paths; source, docs,
examples, and tests owned by RuView are never allowlisted. The generic CI gate
scans the exact revision; GitHub's provider-aware native secret scanning remains
the full-history control. A future provider-verified credential match must be
treated as compromised and rotated before any history decision.

## Preventive controls

- `.github/dependabot.yml` covers GitHub Actions, all 9 npm directories, all 6
  first-party Cargo lockfiles, all Python projects, and both Dockerfile paths.
- `.github/workflows/dependency-security.yml` blocks npm, Python, RustSec, and
  secret findings on pull requests, `main`, and a weekly schedule.
- `.gitleaks.toml` extends maintained defaults and excludes only generated
  output plus exact root submodule working trees.
- `SECURITY.md` defines private reporting, rotation, scanning, privacy, and
  dependency-exception rules.
- `CONTRIBUTING.md` defines safe upstream synchronization and exact-commit CI
  verification.
- GitHub native secret scanning, push protection, Dependabot alerts, security
  updates, and private vulnerability reporting must remain enabled.

## Verification

Use the exact commands in `SECURITY.md`. For a changed component, also run its
focused tests, full tests, formatter, linter, type checker, and build as exposed
by that component's manifests. After every push, wait for GitHub Actions on the
exact commit and correct the first real failure before continuing.

## Residual boundaries

- Advisory databases cannot detect undisclosed vulnerabilities; scheduled
  scans and prompt Dependabot review remain required.
- Pattern scanners can miss provider-specific formats. Short-lived,
  least-privilege credentials and provider audit logs remain essential.
- Each upstream synchronization can reintroduce old manifests, fixtures, or
  workflow behavior and therefore requires the complete gate.
- Radio-derived occupancy and health observations may be sensitive even without
  cameras. Consent, retention, access control, and regulatory review are
  deployment responsibilities.
