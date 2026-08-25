/**
 * Purpose: Prove that the mobile dependency tree is audit-clean and that its
 * reviewed transitive security replacements preserve their consumer APIs.
 * Input: A completed `npm ci` in ui/mobile plus npm registry audit metadata.
 * Output: concise success messages or an actionable failure.
 * Invariants: no credentials are read or printed; temporary files are removed;
 * all audit severities must remain at zero; no secret values are read or logged.
 * Debugging: run `npm audit` and `npm ls uuid --all`, then this file.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');
const shellQuote = require('shell-quote');

const EXPECTED_JS_YAML_VERSION = '4.3.1';
const EXPECTED_SHELL_QUOTE_VERSION = '1.9.0';
const EXPECTED_UUID_VERSION = '11.1.1';

/** Why this exists: the npm override must resolve every consumer to the exact
 * reviewed security release, not merely add a second patched copy. */
function verifyInstalledVersion() {
  const packageMetadata = require('js-yaml/package.json');
  assert.equal(
    packageMetadata.version,
    EXPECTED_JS_YAML_VERSION,
    `Expected js-yaml ${EXPECTED_JS_YAML_VERSION}, found ${packageMetadata.version}. ` +
      'Run npm install --package-lock-only --legacy-peer-deps and review the lockfile.',
  );

  const dependencyTree = spawnSync(
    'npm',
    ['ls', 'js-yaml', '--all', '--json'],
    {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      shell: false,
    },
  );
  if (dependencyTree.status !== 0 || !dependencyTree.stdout) {
    throw new Error(
      `npm could not resolve the complete js-yaml tree (exit ${dependencyTree.status ?? 'unknown'}). ` +
        `stderr: ${dependencyTree.stderr.trim() || 'empty'}`,
    );
  }

  const resolvedVersions = new Set();
  const visit = (node) => {
    const jsYamlNode = node.dependencies?.['js-yaml'];
    if (jsYamlNode?.version) {
      resolvedVersions.add(jsYamlNode.version);
    }
    for (const dependency of Object.values(node.dependencies ?? {})) {
      visit(dependency);
    }
  };
  visit(JSON.parse(dependencyTree.stdout));

  assert.deepEqual(
    [...resolvedVersions],
    [EXPECTED_JS_YAML_VERSION],
    `Expected every js-yaml consumer to resolve to ${EXPECTED_JS_YAML_VERSION}, ` +
      `found: ${[...resolvedVersions].join(', ') || 'none'}`,
  );
  console.log(`js-yaml-version: ${packageMetadata.version} (all consumers)`);
}

/** Why this exists: shell-quote is transitive, so an explicit override and a
 * complete-tree check prevent a vulnerable nested copy from returning. The
 * parse/quote assertions also protect the API used by current consumers. */
function verifyShellQuoteVersionAndCompatibility() {
  const packageMetadata = require('shell-quote/package.json');
  assert.equal(
    packageMetadata.version,
    EXPECTED_SHELL_QUOTE_VERSION,
    `Expected shell-quote ${EXPECTED_SHELL_QUOTE_VERSION}, found ${packageMetadata.version}. ` +
      'Run npm install --package-lock-only --legacy-peer-deps and review the lockfile.',
  );

  const dependencyTree = spawnSync(
    'npm',
    ['ls', 'shell-quote', '--all', '--json'],
    {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      shell: false,
    },
  );
  if (dependencyTree.status !== 0 || !dependencyTree.stdout) {
    throw new Error(
      `npm could not resolve the complete shell-quote tree (exit ${dependencyTree.status ?? 'unknown'}). ` +
        `stderr: ${dependencyTree.stderr.trim() || 'empty'}`,
    );
  }

  const resolvedVersions = new Set();
  const visit = (node) => {
    const shellQuoteNode = node.dependencies?.['shell-quote'];
    if (shellQuoteNode?.version) {
      resolvedVersions.add(shellQuoteNode.version);
    }
    for (const dependency of Object.values(node.dependencies ?? {})) {
      visit(dependency);
    }
  };
  visit(JSON.parse(dependencyTree.stdout));

  assert.deepEqual(
    [...resolvedVersions],
    [EXPECTED_SHELL_QUOTE_VERSION],
    `Expected every shell-quote consumer to resolve to ${EXPECTED_SHELL_QUOTE_VERSION}, ` +
      `found: ${[...resolvedVersions].join(', ') || 'none'}`,
  );
  assert.deepEqual(shellQuote.parse("alpha 'two words'"), ['alpha', 'two words']);
  assert.equal(shellQuote.quote(['alpha', 'two words']), "alpha 'two words'");
  console.log(
    `shell-quote-version: ${packageMetadata.version} (all consumers; API compatible)`,
  );
}

/** Why this exists: @istanbuljs/load-nyc-config is the consumer that previously
 * pinned js-yaml 3.x. Parsing a representative file detects API regressions. */
async function verifyIstanbulYamlCompatibility() {
  const testDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ruview-js-yaml-compatibility-'),
  );

  try {
    fs.writeFileSync(
      path.join(testDirectory, 'package.json'),
      '{"name":"ruview-js-yaml-compatibility"}\n',
    );
    fs.writeFileSync(
      path.join(testDirectory, '.nycrc.yml'),
      'all: true\nexclude:\n  - "dist/**"\nreporter:\n  - text\n',
    );

    const config = await loadNycConfig({ cwd: testDirectory });
    assert.equal(config.all, true);
    assert.deepEqual(config.exclude, ['dist/**']);
    assert.deepEqual(config.reporter, ['text']);
    console.log('istanbul-yaml-compatibility: ok');
  } finally {
    fs.rmSync(testDirectory, { recursive: true, force: true });
  }
}

/** Why this exists: xcode declares an old uuid range but only calls v4(). The
 * global override removes the vulnerable release, while this consumer-level
 * check proves the public function remains available and returns a valid UUID. */
function verifyXcodeUuidCompatibility() {
  const xcodeRequire = createRequire(require.resolve('xcode/package.json'));
  const metadata = xcodeRequire('uuid/package.json');
  const uuid = xcodeRequire('uuid');

  assert.equal(metadata.version, EXPECTED_UUID_VERSION);
  assert.equal(typeof uuid.v4, 'function');
  assert.match(
    uuid.v4(),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  console.log(`xcode-uuid-compatibility: ${metadata.version} (v4 API compatible)`);
}

/** Why this exists: package version checks alone do not prove that npm's current
 * advisory database considers the complete resolved tree safe. Any severity
 * must fail CI so a future transitive regression cannot be silently accepted. */
function verifyNpmAuditResult() {
  const audit = spawnSync('npm', ['audit', '--json'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    shell: false,
  });

  if (!audit.stdout) {
    throw new Error(
      `npm audit returned no JSON output (exit ${audit.status ?? 'unknown'}). ` +
        `stderr: ${audit.stderr.trim() || 'empty'}`,
    );
  }

  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch (error) {
    throw new Error(`npm audit returned invalid JSON: ${error.message}`);
  }

  const counts = report.metadata?.vulnerabilities ?? {};
  assert.equal(
    audit.status,
    0,
    `npm audit failed with ${counts.total ?? 'unknown'} finding(s). Run npm audit for details.`,
  );
  assert.equal(counts.total, 0, `Expected zero npm advisories, found ${counts.total}`);
  console.log('complete-mobile-npm-audit: clear (0 advisories)');
}

async function main() {
  verifyInstalledVersion();
  verifyShellQuoteVersionAndCompatibility();
  await verifyIstanbulYamlCompatibility();
  verifyXcodeUuidCompatibility();
  verifyNpmAuditResult();
}

main().catch((error) => {
  console.error(`Dependency security verification failed: ${error.message}`);
  process.exitCode = 1;
});
