#!/usr/bin/env bash
# Purpose: Reject every RustSec vulnerability and every unexpected maintenance,
# unsoundness, or yanked-crate warning in the Cargo.lock file of this directory.
# Input: A reviewed Cargo.lock plus rustup, cargo-audit 0.22.2, and Rust 1.94.0.
# Output: Exit 0 for a clean audit; otherwise cargo-audit's advisory report.
# Invariants: Only the documented, non-vulnerability maintenance advisories
# below are accepted. No advisory output or error handling may expose secrets.
# Debugging: Run with `bash -x` to see the exact advisory IDs passed to
# cargo-audit, then inspect the reverse dependency with `cargo tree -i CRATE`.

set -Eeuo pipefail

readonly rust_toolchain="${RUVIEW_RUST_TOOLCHAIN:-1.94.0}"
readonly repository_root="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

# Why this exists: a nested `.cargo/audit.toml` can silently suppress findings
# for only one lockfile. Policy belongs in this reviewed script, so every local
# and CI invocation applies exactly the same exceptions.
hidden_audit_configs="$(git -C "${repository_root}" ls-files '*audit.toml')"
if [[ -n "${hidden_audit_configs}" ]]; then
  printf 'ERROR: tracked cargo-audit config is forbidden: %s\n' \
    "${hidden_audit_configs//$'\n'/, }" >&2
  echo "Remove it and document any maintenance-only exception in this script." >&2
  exit 2
fi

if ! command -v rustup >/dev/null 2>&1; then
  echo "ERROR: rustup is unavailable. Install rustup and Rust ${rust_toolchain}, then retry." >&2
  exit 127
fi

if ! command -v cargo-audit >/dev/null 2>&1; then
  echo "ERROR: cargo-audit is unavailable. Install cargo-audit 0.22.2 and retry." >&2
  exit 127
fi

# Why this list exists:
# RustSec classifies these advisories as informational `unmaintained` warnings,
# not known vulnerabilities. Their upstream dependency paths are still needed
# by Tauri/GTK3, RuVector, Candle, geo, or the maintained CLI. The rationale and
# precise removal conditions are reviewed in docs/security/dependency-hardening.md.
readonly ignored_maintenance_advisories=(
  RUSTSEC-2023-0089 # atomic-polyfill via geo -> rstar -> heapless
  RUSTSEC-2024-0370 # proc-macro-error via Tauri's GTK3/glib generation
  RUSTSEC-2024-0411 # gdkwayland-sys: Tauri Linux GTK3 stack
  RUSTSEC-2024-0412 # gdk: Tauri Linux GTK3 stack
  RUSTSEC-2024-0413 # atk: Tauri Linux GTK3 stack
  RUSTSEC-2024-0414 # gdkx11-sys: Tauri Linux GTK3 stack
  RUSTSEC-2024-0415 # gtk: Tauri Linux GTK3 stack
  RUSTSEC-2024-0416 # atk-sys: Tauri Linux GTK3 stack
  RUSTSEC-2024-0417 # gdkx11: Tauri Linux GTK3 stack
  RUSTSEC-2024-0418 # gdk-sys: Tauri Linux GTK3 stack
  RUSTSEC-2024-0419 # gtk3-macros: Tauri Linux GTK3 stack
  RUSTSEC-2024-0420 # gtk-sys: Tauri Linux GTK3 stack
  RUSTSEC-2024-0436 # paste via Candle and nalgebra
  RUSTSEC-2025-0057 # fxhash via reviewed transitive RuVector graph
  RUSTSEC-2025-0075 # unic-char-range via Tauri -> urlpattern
  RUSTSEC-2025-0080 # unic-common via Tauri -> urlpattern
  RUSTSEC-2025-0081 # unic-char-property via Tauri -> urlpattern
  RUSTSEC-2025-0098 # unic-ucd-version via Tauri -> urlpattern
  RUSTSEC-2025-0100 # unic-ucd-ident via Tauri -> urlpattern
  RUSTSEC-2025-0119 # number_prefix via indicatif
  RUSTSEC-2025-0141 # bincode 1/2 via RuVector -> hnsw_rs
  RUSTSEC-2026-0173 # proc-macro-error2 via reviewed transitive macro graph
)

# `spin` 0.9.8 is hard-pinned by both maintained flume generations and was
# withdrawn from crates.io without a RustSec vulnerability. Cargo cannot select
# another 0.9.x release. Dependabot still reports dependency advisories; the
# exact yanked-package boundary and removal condition are documented alongside
# the maintenance exceptions. All RustSec warnings remain blocking here.
audit_arguments=(--deny warnings --no-yanked)
for advisory in "${ignored_maintenance_advisories[@]}"; do
  audit_arguments+=(--ignore "$advisory")
done

rustup run "${rust_toolchain}" cargo audit "${audit_arguments[@]}" "$@"
