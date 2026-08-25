# Reviewed temporal-compare source

Purpose: keep RuView's temporal comparison API while replacing the vulnerable
`lru` 0.12/0.16 dependency with the memory-safe 0.18.2 release.

The source and upstream regression tests come from `ruvnet/midstream`, commit
`583b32ef35dfdb60c7d3d5c28c68f1f635b55b21`. The only dependency change is
`lru = "0.18.2"`. Apache-2.0 and MIT license texts are included alongside it.

Run
`cargo test --manifest-path vendor/midstreamer-temporal-compare/Cargo.toml`
from `v2/` to verify the vendored compatibility surface. Run
`cargo audit --deny warnings` to confirm the old unsafe LRU release cannot
return through the lockfile.
