# Feberdin Dependency and Repository Hardening

## Purpose

This record explains the August 2026 security baseline for the
`Feberdin/RuView` fork, the risks that were found, the remediation decisions,
and the checks required to prevent recurrence. It records package names and
advisory classes but never credential values.

## Baseline findings

The initial GitHub review reported 135 open Dependabot alerts: 61 high, 56
moderate, and 18 low. GitHub code scanning also reported 115 open findings from
KICS and Semgrep. Native GitHub secret scanning and push protection were already
enabled and reported no open secret-scanning alert. Local current-tree scanning
identified upstream example/test strings that matched generic secret patterns;
no active credential was established from those matches. The partial clone
could not complete an independent local history scan, so GitHub's native
full-history result and the full-history CI checkout remain the historical
controls.

The dependency findings were distributed across six npm lockfiles, two Rust
lockfiles, root Python requirements, and the Aether Arena Space. The important
root causes were:

- old Expo/React Native tooling pulled multiple vulnerable build-time packages;
- independently maintained npm packages were absent from Dependabot coverage;
- `python-jose` required the vulnerable and unpatched `ecdsa` package;
- the published `midstreamer-temporal-compare` crate pinned an old `lru` release;
- old PyO3 and Tauri/Rust dependency graphs retained advisories and unmaintained
  packages;
- tracked Vite cache output obscured source review and preserved generated
  dependencies in Git;
- secret scanner failures were permitted by `continue-on-error`.
- mutable GitHub Action tags and permissive IaC defaults produced supply-chain
  and container/Kubernetes findings;
- archived SQL construction and a UDP discovery bind produced Semgrep findings.

## Remediation decisions

### JavaScript and mobile

All maintained npm lockfiles were regenerated against compatible patched
versions and must now return zero findings at `--audit-level=low`. The mobile app
was aligned to Expo 55 and React Native 0.83 instead of hiding peer conflicts
behind `--legacy-peer-deps`. React and React DOM remain on their reviewed patched
19.2 release and are explicitly excluded only from Expo's compatibility pin,
not from vulnerability auditing.

The mobile verifier checks both the selected versions and representative APIs
used by their real consumers. This guards reviewed transitive resolutions such
as YAML parsing, shell quoting, UUID generation, and XML parsing against a future
lockfile regression. It also executes npm's complete advisory check.

The tracked desktop `.vite` cache was removed and `**/.vite/` is ignored. Build
output must be recreated locally or in CI, never reviewed as source.

The mobile documentation previously advertised seven Maestro end-to-end flows
whose tracked YAML files were empty. The flows now contain isolated launch and
screen assertions, the workspace configuration stops on failure, and unused
zero-byte component, hook, and image placeholders were removed. The README no
longer recommends piping a remote installer directly into a shell.

### Code scanning and infrastructure

Every third-party GitHub Action is pinned to an immutable commit SHA. KICS is a
blocking CI gate at every actionable severity. Compose services now drop Linux
capabilities, prohibit privilege escalation, have health checks and resource
limits, and bind host ports to an explicit safe address. The Fluentd workload
runs as an unprivileged user with a read-only root filesystem, short-lived
service-account credentials, namespace quota/limits, and only the two standard
read-only Kubernetes pod-log mounts.

KICS necessarily flags both standard pod-log host mounts under two generic host
filesystem rules. Those four exact findings are excluded by stable result ID in
the workflow; no path-wide or query-wide suppression is used. The prior broad
Docker and `/var/log` mounts were removed. The informational KICS namespace
query is excluded because it reports every deliberate namespace and has no
satisfiable manifest state.

Semgrep findings were fixed by using SQLAlchemy expression objects or reviewed
driver-level DDL for fixed identifiers. ESP32 UDP discovery remains receive-only
and defaults to all local interfaces so broadcast discovery works; operators can
restrict it with `RUVIEW_ESP32_DISCOVERY_BIND_ADDRESS`.

### Python and native bindings

Authentication now uses `PyJWT[crypto]`, eliminating `python-jose` and its
mandatory unpatched `ecdsa` dependency. The archived API imports use PyJWT's
compatible error class and the existing encode/decode call sites remain covered
by Python tests.

The native binding moved to PyO3 and `numpy` 0.29. This required explicit bound
object construction and conversion APIs, and uses the current mechanism for
temporarily detaching from the Python interpreter. The package is verified by
building the real extension with Maturin and importing it in Python; a plain
macOS `cargo test` is not an equivalent extension-module link test.

The Aether Arena Space moved to a current Gradio release and was smoke-tested by
importing the app, verifying its witness chain, and constructing the Blocks UI.

### Rust workspace

The workspace moved to Rust 1.94 and current compatible releases of the affected
runtime dependencies. Unused SQLx MySQL/RSA and MAVLink dependency paths were
removed rather than suppressed. Wasmtime uses the smallest feature set required
by the implemented plugin runtime.

The crates.io release of `midstreamer-temporal-compare` could not select a fixed
`lru` version. A narrow vendored copy from its reviewed upstream source is
therefore patched at the workspace root, preserves upstream licenses and tests,
and changes only the vulnerable dependency selection. Its unit and property
tests are part of the verification record. The exception must be removed when a
compatible fixed upstream release becomes available.

## Preventive controls

- One root `.github/dependabot.yml` covers every maintained package directory;
  individual repositories need their own file, but packages inside this
  monorepo need directory entries rather than duplicate files.
- `.github/workflows/dependency-security.yml` blocks every npm advisory,
  Python advisory, RustSec vulnerability or warning, and Gitleaks finding.
- `.github/workflows/security-scan.yml` blocks KICS and Gitleaks findings and
  uploads the reviewed Semgrep result to GitHub code scanning.
- The existing secret-scanning job no longer soft-fails and its external actions
  are pinned to immutable commits.
- GitHub native secret scanning, push protection, Dependabot alerts, and security
  updates remain enabled.
- `SECURITY.md` defines private reporting, credential rotation, dependency
  exceptions, and privacy handling.
- `CONTRIBUTING.md` makes exact local and post-push CI verification repeatable.

## Operator verification

From the repository root:

```bash
for package in \
  dashboard examples/frontend tools/ruview-cli tools/ruview-mcp ui/mobile \
  v2/crates/wifi-densepose-desktop/ui
do
  (cd "$package" && npm ci --ignore-scripts && npm audit --audit-level=low)
done

pip-audit --strict --requirement requirements.txt
pip-audit --strict --requirement aether-arena/space/requirements.txt
(cd python && cargo audit --deny warnings)
(cd v2 && cargo audit --deny warnings)
gitleaks git --redact --no-banner
gitleaks dir --redact --no-banner .
```

`gitleaks git` requires all promised objects. In a partial clone, first fetch a
complete history in a disposable review clone or rely on the CI job's
`fetch-depth: 0` checkout; do not weaken the current-tree scan.

If a check fails, do not lower its threshold. Record the dependency path, update
the smallest direct dependency or reviewed override, run its focused tests, and
then repeat all relevant package checks.

## Residual boundaries

- A clean advisory database cannot prove that undisclosed vulnerabilities do not
  exist. Scheduled scans and timely review of Dependabot pull requests remain
  required.
- Pattern-based secret scanning can produce both false positives and false
  negatives. Provider-side revocation, least privilege, short expiry, and audit
  logs remain essential.
- The fork intentionally diverges from upstream. Every upstream merge can
  reintroduce an old lockfile or workflow and therefore requires the full gate.
- Radio-derived health and occupancy data can be sensitive even when no camera is
  used. Deployment-specific consent, access control, retention, and regulatory
  review remain operator responsibilities.
