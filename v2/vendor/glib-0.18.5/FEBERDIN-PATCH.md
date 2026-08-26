# Feberdin security backport

Purpose: document why this reviewed local crate source exists and how to replace
it safely. Input is the exact crates.io `glib` 0.18.5 archive; output is an
API-compatible GTK3 dependency with the upstream `VariantStrIter` fix applied.
Debugging starts with the upstream pull request and the focused iterator tests.

## Provenance

- Source: crates.io `glib` 0.18.5
- Original archive SHA-256:
  `233daaf6e83ae6a12a52055f568f9d7cf4671dabb78ff9560ab6da230ce00ee5`
- License: MIT, preserved in `LICENSE`
- Security advisory: `GHSA-wrw7-89jp-8q8g` / `RUSTSEC-2024-0429`
- Upstream fix: `gtk-rs/gtk-rs-core#1343`, merged as
  `05dff0ee696f9bcd8617cd48c4b812d046d440cb`

## Deliberate delta

Only `src/variant_iter.rs` differs from the published archive. The C variadic
out-pointer is mutable and is now passed as `&mut p`; this is the exact upstream
two-line fix. Do not add unrelated local behavior to this copy.

Tauri 2 still resolves GTK3 bindings requiring `glib ^0.18`, so forcing
`glib >=0.20` would mix incompatible binding generations. Remove this vendor
copy and the root `[patch.crates-io]` entry once Tauri/wry no longer depends on
the affected GTK3 line.

## Verification

From `v2/` run:

```bash
cargo test --locked -p wifi-densepose-desktop
../.github/scripts/cargo-audit.sh
```

Also confirm that `Cargo.lock` resolves `glib` without a registry `source` and
that GitHub Dependabot reports no open `glib` alert.
