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

`rumqttc` 0.25.1 still pins the unsupported `rustls-webpki` 0.102 line. The MQTT
features now select rumqttc's supported native TLS backend instead: OpenSSL on
Linux, Security Framework on macOS, and SChannel on Windows. The system trust
store remains enforced, while the four WebPKI advisories and their vulnerable
lockfile entry are removed.

Tauri's Linux GTK3 dependency still requires `glib` 0.18.5, so forcing 0.20
would mix incompatible GTK binding generations. The workspace uses the exact
crates.io 0.18.5 source with upstream pull request `gtk-rs/gtk-rs-core#1343`'s
two-line `VariantStrIter` undefined-behaviour fix backported. Its archive hash,
license, commit, exact delta, verification, and removal condition are recorded
in `v2/vendor/glib-0.18.5/FEBERDIN-PATCH.md`.

Three workspace dependency entries referred to crates removed in upstream issue
578. Cargo tolerated the unused entries, but Dependabot could not fetch the
nonexistent paths and aborted security updates. Those dead entries are removed;
the existing workspace comments continue to document where their planned
functionality lives.

### Reviewed Rust maintenance exceptions

RustSec distinguishes known vulnerabilities from informational maintenance
warnings. The security gate still rejects every vulnerability and every
unexpected warning. It accepts only the exact `unmaintained` advisory IDs in
`.github/scripts/cargo-audit.sh`; none of them currently reports exploitable
code. The exceptions are grouped by their shortest reviewed dependency path:

| Dependency path | Accepted maintenance IDs | Why it remains | Removal condition |
| --- | --- | --- | --- |
| Tauri 2.11 / Wry -> Linux GTK3 | RUSTSEC-2024-0411 through RUSTSEC-2024-0420, plus RUSTSEC-2024-0370 | Tauri's supported Linux webview stack still selects the GTK3 binding generation. Mixing GTK binding generations is not ABI-safe. The concrete GLib undefined behaviour is separately fixed by the reviewed local patch. | Remove when Tauri/Wry ships a compatible maintained Linux GUI stack, then test desktop builds on Linux, macOS, and Windows. |
| Tauri -> `urlpattern` -> UNIC 0.9 | RUSTSEC-2025-0075, -0080, -0081, -0098, -0100 | Current Tauri utilities resolve this parser chain; the advisories report maintenance status, not a vulnerability. | Remove when Tauri or `urlpattern` drops UNIC 0.9, then regenerate and audit the lockfile. |
| `geo` -> `rstar` -> `heapless` -> `atomic-polyfill` | RUSTSEC-2023-0089 | The MAT geometry implementation still uses the compatible geo 0.27 API. | Upgrade geo/rstar under focused geometry tests and remove the ID once `atomic-polyfill` leaves the lockfile. |
| RuVector -> `hnsw_rs` -> `bincode` 1/2 | RUSTSEC-2025-0141 | The maintained RuVector integration currently resolves both serialization generations; the advisory is maintenance-only. | Upgrade RuVector/hnsw when their public releases remove bincode, then rerun vector persistence compatibility tests. |
| Candle/nalgebra -> `paste` | RUSTSEC-2024-0436 | Current supported numerical crates still resolve the macro; no vulnerable behavior is reported. | Remove after upstream numerical releases eliminate `paste` and model tests remain green. |
| CLI/training -> `indicatif` -> `number_prefix` | RUSTSEC-2025-0119 | The current progress display API remains compatible and the advisory is maintenance-only. | Upgrade indicatif in a dedicated UX change and verify CLI snapshots/progress behavior. |

Adding an ID requires a reviewed dependency path, a non-vulnerability advisory,
a removal condition, and a pull request changing both this table and the audit
script. A vulnerability ID must never be added to the exception list.

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
(cd python && ../.github/scripts/cargo-audit.sh)
(cd v2 && ../.github/scripts/cargo-audit.sh)
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
