# Security Policy

## Purpose and scope

This policy describes how the `Feberdin/RuView` fork prevents secrets and
known-vulnerable dependencies from reaching its default branch, how to report a
vulnerability privately, and how maintainers should respond.

The supported security baseline is the latest commit on Feberdin's `main`
branch. Upstream tags and historical revisions remain useful for comparison but
do not automatically contain the hardening maintained in this fork.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability, exposed credential,
private network detail, or personal data.

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability** to create a private security advisory.
3. Describe the affected revision, reproduction steps, impact, and a suggested
   mitigation. Replace credentials and identifying data with placeholders.
4. If private reporting is temporarily unavailable, contact the repository owner
   through a private channel and include only a reference to the finding. Never
   paste the secret value itself.

Expected initial acknowledgement is within seven days. Exploitable credential
exposure is treated as an incident and handled immediately when noticed.

## Secret handling rules

- Never commit `.env` files, tokens, passwords, cookies, private keys, Wi-Fi
  credentials, production logs, NVS credential images, or real patient data.
- Use environment-variable names or documented placeholders in examples.
- Treat every committed credential as compromised, even if a later commit removes
  it. Revoke or rotate it at the issuing provider before rewriting history.
- Do not paste secret values into issues, pull requests, Actions logs, screenshots,
  test fixtures, error messages, or chat transcripts.
- Keep GitHub secret scanning, push protection, Dependabot alerts, and Dependabot
  security updates enabled. A deliberate exception requires a documented threat
  assessment and an expiry date.
- For Feberdin Unraid deployments, use only Broker-managed `secret://NAME`
  references. Never deploy through direct SSH, Docker CLI, or raw remote commands.

The repository ignores common local credentials and generated build outputs. An
ignore rule is not a security boundary: review staged changes and run Gitleaks
before every push.

## Required local checks

Run the checks for every package family touched by a change:

```bash
# Complete history and current worktree; output is redacted.
gitleaks git --redact --no-banner
gitleaks dir --redact --no-banner .

# Python requirements.
pip-audit --strict --requirement requirements.txt
pip-audit --strict --requirement aether-arena/space/requirements.txt

# Rust lockfiles.
(cd v2 && cargo audit --deny warnings)
(cd python && cargo audit --deny warnings)

# JavaScript lockfiles; repeat in every listed package directory.
npm ci --ignore-scripts
npm audit --audit-level=low
```

Maintained npm packages are `dashboard`, `examples/frontend`,
`tools/ruview-cli`, `tools/ruview-mcp`, `ui/mobile`, and
`v2/crates/wifi-densepose-desktop/ui`. The mobile package additionally runs
`npm run test:dependency-security` to prove that reviewed transitive overrides
still satisfy their real consumers.

The workflow
[`dependency-security.yml`](.github/workflows/dependency-security.yml) repeats
these gates on pull requests, `main`, and a weekly schedule. Security jobs are
not allowed to succeed through `continue-on-error`.

## Credential incident response

If a secret is found in Git history:

1. Do not copy or test the value.
2. Identify the provider and affected account from metadata only.
3. Revoke the credential at the provider, then create a least-privilege
   replacement with a short expiry where supported.
4. Update the consuming environment through its secret manager, never through
   Git.
5. Review provider audit logs from the first exposed commit until revocation.
6. Remove the value from current files. Rewrite history only after coordinating
   with every clone owner; rotation is the actual containment step.
7. Record dates, affected scopes, and completed containment in a private incident
   record without preserving the value.

For a GitHub personal access token, revoke it under **Settings → Developer
settings → Personal access tokens**, review account and organization audit logs,
and replace it with the narrowest repository and permission scope possible.

## Dependency exception policy

Known vulnerabilities and RustSec warnings fail the security gate at every
severity. An exception is allowed only when no fixed compatible version exists
and all of the following are committed:

- the advisory identifier and affected dependency path;
- proof that the vulnerable code path is unreachable or separately mitigated;
- an owner and review deadline;
- a targeted compatibility test;
- a narrow, documented scanner ignore that expires.

Broad scanner suppression, unbounded version ranges, and `continue-on-error` are
not accepted as remediation.

## Privacy and medical safety

RuView processes radio-derived occupancy, motion, and possible vital-sign data.
Treat recordings and derived observations as sensitive. Use synthetic fixtures
in tests, minimize retention, restrict access, and obtain all legally required
consent. The software is not a certified medical device and must not be the sole
basis for diagnosis, emergency response, or safety-critical decisions.
