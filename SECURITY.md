# Security Policy

## Purpose and supported revision

This policy covers the latest commit on `Feberdin/RuView`'s `main` branch.
The fork tracks `ruvnet/RuView`, but upstream revisions do not automatically
include Feberdin's dependency and secret-safety controls.

## Report privately

Do not open a public issue for a suspected vulnerability, exposed credential,
private network detail, or personal data. Use **Security → Report a
vulnerability** in GitHub. Include the affected revision, impact, and redacted
reproduction steps. Never include the credential value itself.

## Secret rules

- Never commit `.env` files, passwords, tokens, cookies, private keys, Wi-Fi
  credentials, production logs, or personal/medical data.
- Examples use environment-variable names or unmistakable placeholders.
- Treat any committed credential as compromised. Revoke it at its provider,
  create a least-privilege replacement, update the consuming secret manager,
  and review provider audit logs from exposure through revocation.
- Keep GitHub secret scanning, push protection, Dependabot alerts, Dependabot
  security updates, and the repository security workflows enabled.
- For Feberdin Unraid, use only Broker-managed `secret://NAME` references. Do
  not deploy with direct SSH, Docker CLI, or raw remote commands.

For an exposed GitHub personal access token, revoke it under **Settings →
Developer settings → Personal access tokens**, then review account and
organization audit logs. Removing it from a later commit is not containment.

## Required checks

From the repository root:

```bash
gitleaks dir --config .gitleaks.toml --redact --no-banner .
# In a complete clone, this is an additional historical review. GitHub native
# secret scanning is the authoritative provider-aware full-history control.
gitleaks git --config .gitleaks.toml --redact --no-banner .

for package in dashboard examples/frontend harness/homecore harness/ruview \
  integrations/iphone-lidar/web tools/ruview-cli tools/ruview-mcp ui/mobile \
  v2/crates/wifi-densepose-desktop/ui; do
  (cd "$package" && npm ci --ignore-scripts && npm audit --audit-level=low)
done

for lock in python/Cargo.lock v2/Cargo.lock \
  v2/crates/homecore-plugin-example/Cargo.lock \
  v2/crates/wifi-densepose-physics/fuzz/Cargo.lock \
  v2/crates/wifi-densepose-wasm-edge/Cargo.lock \
  v2/patches/ruvector-crv/Cargo.lock; do
  .github/scripts/cargo-audit.sh --file "$lock"
done

pip-audit --strict --requirement aether-arena/space/requirements.txt
pip-audit --strict --requirement archive/v1/requirements-lock.txt
```

The workflow `.github/workflows/dependency-security.yml` repeats these checks
on pull requests, `main`, and a weekly schedule. Security jobs must not use
`continue-on-error`.

## Dependency exceptions

Known vulnerabilities and unsoundness warnings are not accepted. A temporary
maintenance-only exception requires the advisory ID, dependency path, reason,
owner, removal condition, and a focused compatibility test. Broad scanner
suppression is prohibited. The reviewed Rust exceptions are documented in
`docs/security/dependency-hardening.md` and enforced centrally by
`.github/scripts/cargo-audit.sh`.

## Privacy and medical safety

RuView can derive occupancy, motion, and vital-sign observations from radio
signals. Treat recordings and derived data as sensitive: use synthetic tests,
minimize retention, restrict access, and obtain required consent. RuView is not
a certified medical device and must not be the sole basis for diagnosis,
emergency response, or safety-critical decisions.
