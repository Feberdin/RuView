//! HOMECORE-PLUGINS — WASM integration plugin system.
//!
//! Implements [ADR-128](../../docs/adr/ADR-128-homecore-integration-plugin-system.md)
//! P1 scaffold: manifest parsing, the `HomeCorePlugin` async trait, the
//! `PluginRuntime` abstraction, and the `PluginRegistry`.
//!
//! ## What's here (P1)
//!
//! - [`manifest`] — `PluginManifest`: superset of HA `manifest.json`; serde
//!   round-trip + required-field validation.
//! - [`plugin`] — `HomeCorePlugin` async trait, `PluginId` newtype.
//! - [`runtime`] — `PluginRuntime` trait + `InProcessRuntime` (native Rust,
//!   first-party plugins compiled into the binary).
//! - [`registry`] — `PluginRegistry<R>`: load / unload / list plugins.
//! - [`error`] — `PluginError` typed error enum.
//!
//! ## What's NOT here yet (deferred)
//!
//! - `WasmtimeRuntime` (P2, `--features wasmtime`): Cranelift JIT sandbox on
//!   Pi 5 / x86_64. The unimplemented wasm3 alternative was removed because
//!   the dependency has no maintained security release.
//! - Host ABI wiring: `hc_state_get`, `hc_state_set`, `hc_event_fire`, etc.
//!   (P2 — requires ADR-127 state machine API freeze first).
//! - Config entry lifecycle + hot-load (P3).
//! - Cog registry distribution + Ed25519 signature verification (P4).
//! - Permission enforcement (P5).
//!
//! ## Feature flags
//!
//! | Feature | Default | Description |
//! |---------|---------|-------------|
//! | `wasmtime` | off | Wasmtime Cranelift JIT runtime (P2) |

pub mod error;
pub mod host_abi;
pub mod manifest;
pub mod plugin;
pub mod registry;
pub mod runtime;

#[cfg(feature = "wasmtime")]
pub mod wasmtime_runtime;

pub use error::PluginError;
pub use host_abi::{ConfigEntryJson, StateChangedEventJson};
pub use manifest::{IntegrationType, IotClass, PluginManifest};
pub use plugin::{HomeCorePlugin, PluginId};
pub use registry::PluginRegistry;
pub use runtime::{InProcessRuntime, LoadedPlugin, PluginRuntime};

#[cfg(feature = "wasmtime")]
pub use wasmtime_runtime::{WasmPlugin, WasmtimeRuntime};

#[cfg(test)]
mod tests;
